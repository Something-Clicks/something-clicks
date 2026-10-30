"""Load-step tests against a real Postgres + PostGIS database with the migrations applied.

Set TEST_DATABASE_URL to run them; every test rolls back its changes.
"""

import os

import psycopg
import pytest

from sc_overture import load as L
from sc_overture.seed import seed

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")


@pytest.fixture
def conn():
    with psycopg.connect(URL) as c:
        seed(c)  # idempotent; commits journey data and the starter cluster
        # A throwaway cluster, so tests never touch a locally loaded real cluster.
        with c.cursor() as cur:
            cur.execute("""insert into clusters (slug, name, journey_id, min_lng, min_lat, max_lng, max_lat, center)
                           values ('test-load', 'Test', 'weddings', -112, 40, -111, 41, st_makepoint(-111.5, 40.5)::geography)""")
        yield c
        c.rollback()


def row(gers, name="Bloom & Co", category="florists", **kw):
    base = dict(gers_id=gers, name=name, category_id=category, classified_by="taxonomy", taxonomy_primary="florist",
                taxonomy_hierarchy=["florist"], website="https://bloom.example", phone="+18015550101",
                email="hi@bloom.example", street="1 Main St", locality="Sandy", region="UT", postcode="84070",
                lat=40.57, lng=-111.86, confidence=0.9, source_datasets=["meta"], merged_gers_ids=[])
    base.update(kw)
    return base


def place(conn, gers):
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute("select *, st_y(geog::geometry) as lat from places where gers_id = %s", (gers,))
        return cur.fetchone()


def test_insert_then_update_and_stale(conn):
    cluster = L.get_cluster(conn, "test-load")["id"]
    assert L.load(conn, cluster, "2026-09-23.0", [row("t-a"), row("t-b", name="Old Venue", category="wedding_venues")]) == {
        "inserted": 2, "updated": 0, "marked_stale": 0}
    assert place(conn, "t-a")["cluster_ids"] == [cluster]
    assert round(place(conn, "t-a")["lat"], 2) == 40.57

    # New release: t-a refreshed, t-b missing so it becomes stale.
    stats = L.load(conn, cluster, "2026-10-21.0", [row("t-a", name="Bloom and Co", confidence=0.95)])
    assert stats == {"inserted": 0, "updated": 1, "marked_stale": 1}
    a, b = place(conn, "t-a"), place(conn, "t-b")
    assert a["name"] == "Bloom and Co" and a["release"] == "2026-10-21.0" and not a["stale"]
    assert b["stale"]


def test_claimed_businesses_keep_owner_fields(conn):
    cluster = L.get_cluster(conn, "test-load")["id"]
    L.load(conn, cluster, "2026-09-23.0", [row("t-c")])
    with conn.cursor() as cur:
        cur.execute("""update places set state = 'verified', name = 'Bloom Studio', website = 'https://bloomstudio.example',
                       category_id = 'event_rentals', classified_by = 'owner' where gers_id = 't-c'""")
    L.load(conn, cluster, "2026-10-21.0", [row("t-c", name="Bloom & Co", confidence=0.7)])
    c = place(conn, "t-c")
    assert (c["name"], c["website"], c["category_id"]) == ("Bloom Studio", "https://bloomstudio.example", "event_rentals")
    assert c["confidence"] == pytest.approx(0.7) and c["release"] == "2026-10-21.0"


def test_suppression_and_budget_helpers(conn):
    with conn.cursor() as cur:
        cur.execute("insert into suppression (kind, value, reason) values ('domain', 'blocked.example', 'removal')")
    assert "blocked.example" in L.suppression(conn).domains
    assert L.new_place_count(conn, ["t-x", "t-y"]) == 2
    assert L.database_bytes(conn) > 0
