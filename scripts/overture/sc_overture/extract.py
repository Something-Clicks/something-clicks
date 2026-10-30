"""Extract a cluster's candidate places from Overture into a local Parquet file.

DuckDB reads S3 directly when its httpfs extension loads. Where extensions
are blocked, PyArrow reads only the row groups whose bbox intersects one of
the cluster's boxes, over HTTPS range requests.

Rows are pre-filtered to the US and to the journey's taxonomy values or name
rules, so a national scan keeps ~250k rows instead of 18M. transform.py then
applies the full cleaning rules.
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

import duckdb

from .release import place_files

COLUMNS = [
    "id", "names.primary", "basic_category", "taxonomy", "confidence", "operating_status",
    "websites", "phones", "emails", "addresses", "sources", "bbox",
]

BBox = tuple[float, float, float, float]  # min_lng, min_lat, max_lng, max_lat

# Contiguous US, Alaska, Hawaii.
US_BOXES: list[BBox] = [(-125.0, 24.0, -66.5, 49.6), (-170.0, 51.0, -129.0, 71.6), (-161.0, 18.5, -154.5, 22.5)]


@dataclass(frozen=True)
class Prefilter:
    taxonomy: frozenset[str]
    name_pattern: str | None  # one case-insensitive alternation of the name rules


def extract(release: str, boxes: list[BBox], out: Path, prefilter: Prefilter, log=print) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        return _extract_duckdb(release, boxes, out, prefilter, log)
    except duckdb.Error as e:
        log(f"DuckDB S3 access unavailable ({str(e).splitlines()[0][:120]}); using PyArrow range reads.")
        return _extract_pyarrow(release, boxes, out, prefilter, log)


def _sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def _extract_duckdb(release: str, boxes: list[BBox], out: Path, pf: Prefilter, log) -> Path:
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    src = f"s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*.parquet"
    in_boxes = " OR ".join(
        f"(bbox.xmin <= {x1} AND bbox.xmax >= {x0} AND bbox.ymin <= {y1} AND bbox.ymax >= {y0})" for x0, y0, x1, y1 in boxes
    )
    tax = ", ".join(_sql_str(t) for t in sorted(pf.taxonomy)) or "NULL"
    by_name = f" OR regexp_matches(names.primary, {_sql_str(pf.name_pattern)}, 'i')" if pf.name_pattern else ""
    cols = ", ".join("struct_pack(\"primary\" := names.primary) AS names" if c == "names.primary" else c for c in COLUMNS)
    con.execute(
        f"""COPY (
              SELECT {cols} FROM read_parquet('{src}')
              WHERE ({in_boxes}) AND addresses[1].country = 'US'
                AND (taxonomy.primary IN ({tax}){by_name})
            ) TO '{out}' (FORMAT parquet)"""
    )
    log(f"Extracted with DuckDB to {out}")
    return out


def _row_group_bbox(md, i):
    rg = md.row_group(i)
    s = {}
    for j in range(rg.num_columns):
        c = rg.column(j)
        if c.path_in_schema.startswith("bbox.") and c.statistics is not None:
            s[c.path_in_schema[5:]] = (c.statistics.min, c.statistics.max)
    return s["xmin"][0], s["ymin"][0], s["xmax"][1], s["ymax"][1]


def _intersects(b: BBox, boxes: list[BBox]) -> bool:
    return any(not (b[2] < x0 or b[0] > x1 or b[3] < y0 or b[1] > y1) for x0, y0, x1, y1 in boxes)


def prefilter_mask(t, boxes: list[BBox], pf: Prefilter):
    """Rows inside any box, with a US address, and a journey taxonomy value or a name-rule hit."""
    import pyarrow as pa
    import pyarrow.compute as pc

    b = t["bbox"]
    xmin, xmax, ymin, ymax = (pc.struct_field(b, f) for f in ("xmin", "xmax", "ymin", "ymax"))
    inside = None
    for x0, y0, x1, y1 in boxes:
        m = pc.and_(pc.and_(pc.less_equal(xmin, x1), pc.greater_equal(xmax, x0)),
                    pc.and_(pc.less_equal(ymin, y1), pc.greater_equal(ymax, y0)))
        inside = m if inside is None else pc.or_(inside, m)
    country = pc.struct_field(pc.list_element(t["addresses"], 0), "country")
    us = pc.fill_null(pc.equal(country, "US"), False)
    wanted = pc.fill_null(
        pc.is_in(pc.struct_field(t["taxonomy"], "primary"), value_set=pa.array(sorted(pf.taxonomy), pa.string())), False
    )
    if pf.name_pattern:
        named = pc.fill_null(
            pc.match_substring_regex(pc.struct_field(t["names"], "primary"), pf.name_pattern, ignore_case=True), False
        )
        wanted = pc.or_(wanted, named)
    return pc.and_(pc.and_(inside, us), wanted)


def _extract_pyarrow(release: str, boxes: list[BBox], out: Path, pf: Prefilter, log) -> Path:
    import pyarrow as pa
    import pyarrow.parquet as pq

    from .httpfs import http_fs

    fs = http_fs()
    started = time.time()

    def read(url: str):
        # Exact-range reads coalesced by PyArrow (pre_buffer) are ~3x faster than read-ahead caching.
        f = pq.ParquetFile(fs.open(url, "rb", cache_type="none"), pre_buffer=True)
        md = f.metadata
        groups = [i for i in range(md.num_row_groups) if _intersects(_row_group_bbox(md, i), boxes)]
        parts = []
        for i in range(0, len(groups), 8):
            for attempt in range(4):
                try:
                    t = f.read_row_groups(groups[i:i + 8], columns=COLUMNS)
                    break
                except Exception:  # noqa: BLE001 - network errors surface as several exception types
                    if attempt == 3:
                        raise
                    time.sleep(2 ** (attempt + 1))
            parts.append(t.filter(prefilter_mask(t, boxes, pf)))
        return parts

    urls = place_files(release)
    tables = []
    with ThreadPoolExecutor(4) as ex:
        for n, parts in enumerate(ex.map(read, urls), 1):
            tables.extend(parts)
            log(f"  file {n}/{len(urls)} · {sum(t.num_rows for t in tables):,} candidate rows · {time.time() - started:.0f}s")
    tables = [t for t in tables if t.num_rows]
    if not tables:
        raise SystemExit("No candidate places found for this cluster.")
    table = pa.concat_tables(tables, promote_options="permissive")
    pq.write_table(table, out)
    log(f"Extracted {table.num_rows:,} candidate rows with PyArrow to {out}")
    return out
