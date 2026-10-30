"""Extract one cluster's places from Overture into a local Parquet file.

DuckDB reads S3 directly when its httpfs extension loads. Where extensions
are blocked, PyArrow reads only the row groups whose bbox intersects the
cluster, over HTTPS range requests. Either way the result is a local file
that DuckDB queries in transform.py.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import duckdb

from .release import place_files

COLUMNS = [
    "id", "names", "basic_category", "taxonomy", "confidence", "operating_status",
    "websites", "phones", "emails", "addresses", "sources", "bbox",
]

BBox = tuple[float, float, float, float]  # min_lng, min_lat, max_lng, max_lat


def extract(release: str, bbox: BBox, out: Path, log=print) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        return _extract_duckdb(release, bbox, out, log)
    except duckdb.Error as e:
        log(f"DuckDB S3 access unavailable ({str(e).splitlines()[0][:120]}); using PyArrow range reads.")
        return _extract_pyarrow(release, bbox, out, log)


def _extract_duckdb(release: str, bbox: BBox, out: Path, log) -> Path:
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")
    x0, y0, x1, y1 = bbox
    src = f"s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*.parquet"
    con.execute(
        f"""COPY (
              SELECT {", ".join(COLUMNS)} FROM read_parquet('{src}')
              WHERE bbox.xmin <= {x1} AND bbox.xmax >= {x0} AND bbox.ymin <= {y1} AND bbox.ymax >= {y0}
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


def _extract_pyarrow(release: str, bbox: BBox, out: Path, log) -> Path:
    import fsspec
    import pyarrow as pa
    import pyarrow.compute as pc
    import pyarrow.parquet as pq

    fs = fsspec.filesystem("http", client_kwargs={"trust_env": True}, block_size=8 * 2**20)
    x0, y0, x1, y1 = bbox

    def read(url: str):
        f = pq.ParquetFile(fs.open(url, "rb"))
        md = f.metadata
        tables = []
        for i in range(md.num_row_groups):
            bx0, by0, bx1, by1 = _row_group_bbox(md, i)
            if bx1 < x0 or bx0 > x1 or by1 < y0 or by0 > y1:
                continue
            t = f.read_row_group(i, columns=COLUMNS)
            b = t["bbox"]
            mask = pc.and_(
                pc.and_(pc.less_equal(pc.struct_field(b, "xmin"), x1), pc.greater_equal(pc.struct_field(b, "xmax"), x0)),
                pc.and_(pc.less_equal(pc.struct_field(b, "ymin"), y1), pc.greater_equal(pc.struct_field(b, "ymax"), y0)),
            )
            tables.append(t.filter(mask))
        return tables

    urls = place_files(release)
    with ThreadPoolExecutor(4) as ex:
        parts = [t for ts in ex.map(read, urls) for t in ts]
    if not parts:
        raise SystemExit("No places found in the cluster's bounding box.")
    table = pa.concat_tables(parts, promote_options="permissive")
    pq.write_table(table, out)
    log(f"Extracted {table.num_rows:,} rows with PyArrow to {out}")
    return out
