"""National pass over US places: ZIP x category counts and a location lookup.

Produces, without storing any business names:
  - place_counts: number of mapped-category places per ZIP code (5 digits)
  - geo_lookup: ZIP-code and city centers (mean location of the businesses there)

Reads only US row groups with PyArrow and aggregates each batch with DuckDB,
so it needs no DuckDB extensions and runs anywhere.
"""

from __future__ import annotations

import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

import duckdb
import pyarrow as pa
import psycopg

from . import journeys as J
from . import load as L
from .extract import _row_group_bbox
from .release import latest_release, place_files

US_BOXES = [(-125.0, 24.0, -66.5, 49.6), (-170.0, 51.0, -129.0, 71.6), (-161.0, 18.5, -154.5, 22.5)]
COLUMNS = ["names", "taxonomy", "confidence", "operating_status", "addresses", "bbox"]
MIN_PLACES_PER_ZIP = 3
MIN_PLACES_PER_CITY = 10


def _intersects_us(b) -> bool:
    return any(not (b[2] < x0 or b[0] > x1 or b[3] < y0 or b[1] > y1) for x0, y0, x1, y1 in US_BOXES)


def _sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


class Aggregator:
    """Accumulates per-batch DuckDB aggregates."""

    def __init__(self, taxonomy_map: dict[str, str], name_rules: list[tuple[str, str]], min_confidence: float):
        self.counts: dict[tuple[str, str], int] = defaultdict(int)
        self.zips: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0, 0])
        self.cities: dict[tuple[str, str], list] = {}
        self.us_rows = 0
        self.con = duckdb.connect()
        self.con.execute("CREATE TABLE taxmap (taxonomy TEXT, category_id TEXT)")
        if taxonomy_map:
            self.con.executemany("INSERT INTO taxmap VALUES (?, ?)", list(taxonomy_map.items()))
        self.name_case = (
            "CASE " + " ".join(f"WHEN regexp_matches(name, {_sql_str(p)}, 'i') THEN {_sql_str(c)}" for c, p in name_rules) + " END"
            if name_rules else "NULL"
        )
        self.min_confidence = float(min_confidence)

    def add(self, batch: pa.Table) -> None:
        con = self.con
        con.register("batch", batch)
        con.execute(
            """
            CREATE OR REPLACE TEMP TABLE us AS
            SELECT names.primary AS name, taxonomy.primary AS tax, confidence, operating_status AS status,
                   left(regexp_replace(coalesce(addresses[1].postcode, ''), '[^0-9]', '', 'g'), 5) AS zip,
                   trim(coalesce(addresses[1].locality, '')) AS city, upper(coalesce(addresses[1].region, '')) AS region,
                   (bbox.ymin + bbox.ymax) / 2 AS lat, (bbox.xmin + bbox.xmax) / 2 AS lng
            FROM batch WHERE addresses[1].country = 'US'
            """
        )
        self.us_rows += con.execute("SELECT count(*) FROM us").fetchone()[0]
        for zip_, cat, n in con.execute(
            f"""
            SELECT zip, coalesce(t.category_id, {self.name_case}) AS cat, count(*)
            FROM us LEFT JOIN taxmap t ON t.taxonomy = us.tax
            WHERE length(zip) = 5 AND confidence >= {self.min_confidence}
              AND coalesce(status, 'open') NOT IN ('permanently_closed', 'temporarily_closed')
              AND name IS NOT NULL AND regexp_matches(name, '[A-Za-z]')
              AND coalesce(t.category_id, {self.name_case}) IS NOT NULL
            GROUP BY 1, 2
            """
        ).fetchall():
            self.counts[(zip_, cat)] += n
        for zip_, slat, slng, n in con.execute(
            "SELECT zip, sum(lat), sum(lng), count(*) FROM us WHERE length(zip) = 5 GROUP BY 1"
        ).fetchall():
            z = self.zips[zip_]
            z[0] += slat; z[1] += slng; z[2] += n  # noqa: E702
        for key, display, slat, slng, n in con.execute(
            """SELECT lower(city) || '|' || region, any_value(city), sum(lat), sum(lng), count(*)
               FROM us WHERE city <> '' AND length(region) = 2 GROUP BY 1"""
        ).fetchall():
            c = self.cities.setdefault(key, [display, 0.0, 0.0, 0])
            c[1] += slat; c[2] += slng; c[3] += n  # noqa: E702
        con.unregister("batch")

    def place_counts(self) -> list[tuple[str, str, int]]:
        return sorted((z, c, n) for (z, c), n in self.counts.items())

    def geo_rows(self) -> list[tuple[str, str, str, str | None, float, float]]:
        """(kind, name, state, zcta, lat, lng)."""
        rows = [("zcta", z, "", z, s[0] / s[2], s[1] / s[2]) for z, s in self.zips.items() if s[2] >= MIN_PLACES_PER_ZIP]
        for key, (display, slat, slng, n) in self.cities.items():
            if n >= MIN_PLACES_PER_CITY:
                rows.append(("place", display, key.split("|")[1], None, slat / n, slng / n))
        return rows


def scan(release: str, agg: Aggregator, log=print, max_files: int | None = None) -> None:
    import fsspec
    import pyarrow.parquet as pq

    # Exact-range reads coalesced by PyArrow (pre_buffer) are ~3x faster than read-ahead caching.
    fs = fsspec.filesystem("http", client_kwargs={"trust_env": True})
    urls = place_files(release)[:max_files]
    started = time.time()

    def read(url: str) -> list[pa.Table]:
        f = pq.ParquetFile(fs.open(url, "rb", cache_type="none"), pre_buffer=True)
        md = f.metadata
        groups = [i for i in range(md.num_row_groups) if _intersects_us(_row_group_bbox(md, i))]
        return [f.read_row_groups(groups[i:i + 16], columns=COLUMNS) for i in range(0, len(groups), 16)]

    with ThreadPoolExecutor(4) as ex:
        for n, tables in enumerate(ex.map(read, urls), 1):
            for t in tables:
                agg.add(t)
            log(f"  file {n}/{len(urls)} · {agg.us_rows:,} US rows · {time.time() - started:.0f}s")


def run_national(conn: psycopg.Connection, *, dry_run: bool, release: str | None = None,
                 journey_id: str = "weddings", min_confidence: float = 0.6, log=print, max_files: int | None = None) -> dict:
    release = release or latest_release(log)
    run_id = L.start_run(conn, None, "counts", "dry_run" if dry_run else "load", release)
    try:
        data = J.load()
        agg = Aggregator(
            J.taxonomy_map(data, journey_id),
            [(c, p.pattern) for c, p in J.name_rules(data, journey_id)],
            min_confidence,
        )
        scan(release, agg, log, max_files)
        counts, geo = agg.place_counts(), agg.geo_rows()
        # ~70 B per counts row and ~140 B per lookup row, including indexes.
        projected = len(counts) * 70 + len(geo) * 140
        before = L.database_bytes(conn)
        report = {
            "run_id": run_id, "release": release, "us_rows": agg.us_rows,
            "place_counts_rows": len(counts), "places_counted": sum(n for _, _, n in counts),
            "geo_lookup_rows": len(geo), "zip_rows": sum(1 for g in geo if g[0] == "zcta"),
            "city_rows": sum(1 for g in geo if g[0] == "place"),
            "projected_bytes": projected, "database_bytes_before": before,
            "within_budget": before + projected <= L.budget_bytes(),
        }
        msg = (f"{len(counts):,} ZIP x category rows ({report['places_counted']:,} places), "
               f"{len(geo):,} lookup rows")
        if dry_run:
            _finish(conn, run_id, "succeeded", report, "dry run: " + msg)
            return report
        if not report["within_budget"]:
            _finish(conn, run_id, "refused", report, "over budget")
            raise SystemExit("Refused: national tables would exceed the database budget.")
        with conn.cursor() as cur:
            cur.execute("truncate place_counts")
            with cur.copy("copy place_counts (zcta, category_id, n, release) from stdin") as cp:
                for z, c, n in counts:
                    cp.write_row((z, c, n, release))
            cur.execute("truncate geo_lookup")
            cur.execute("create temp table geo_stage (kind text, name text, state text, zcta text, lat float8, lng float8) on commit drop")
            with cur.copy("copy geo_stage from stdin") as cp:
                for row in geo:
                    cp.write_row(row)
            cur.execute("""insert into geo_lookup (kind, name, state, zcta, geog)
                           select kind, name, state, zcta, st_setsrid(st_makepoint(lng, lat), 4326)::geography from geo_stage""")
        conn.commit()
        _finish(conn, run_id, "succeeded", report, "loaded: " + msg)
        return report
    except SystemExit:
        raise
    except Exception as e:
        L.finish_run(conn, run_id, "failed", message=f"{type(e).__name__}: {e}"[:2000])
        raise


def _finish(conn, run_id, status, report, message):
    conn.rollback()
    with conn.cursor() as cur:
        cur.execute(
            """update import_runs set status = %s, rows_read = %s, rows_kept = %s, projected_bytes = %s,
                 database_bytes_before = %s, message = %s, finished_at = now() where id = %s""",
            (status, report["us_rows"], report["place_counts_rows"], report["projected_bytes"],
             report["database_bytes_before"], message, run_id),
        )
    conn.commit()
