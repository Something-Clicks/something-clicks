"""compute_matches() rules against a real PostGIS database (TEST_DATABASE_URL); rolled back."""

import os

import psycopg
import pytest

from sc_overture import load as L
from sc_overture.seed import seed
from tests.test_load import row

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")

KM = 1 / 111.0  # ~1 km of latitude


@pytest.fixture
def db():
    with psycopg.connect(URL) as c:
        seed(c)
        with c.cursor() as cur:  # isolate from any locally loaded cluster
            cur.execute("""insert into clusters (slug, name, journey_id, min_lng, min_lat, max_lng, max_lat, center)
                           values ('test-match', 'Test', 'weddings', -112, 40, -111, 41, st_makepoint(-111.5, 40.5)::geography)
                           returning id""")
            cluster = cur.fetchone()[0]
        yield c, cluster
        c.rollback()


def add(conn, cluster, gers, category, lat_km=0.0, locality="Sandy", serves=None):
    L.load(conn, cluster, "r1", [row(gers, name=gers, category=category, lat=40.5 + lat_km * KM, lng=-111.5, locality=locality)])
    if serves is not None:
        with conn.cursor() as cur:
            cur.execute("update places set serves_journey = %s where gers_id = %s", (serves, gers))


def matches(conn, gers):
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute("""select b.gers_id, m.* from matches m join places a on a.id = m.place_a join places b on b.id = m.place_b
                       where a.gers_id = %s order by m.score desc""", (gers,))
        return {r["gers_id"]: r for r in cur.fetchall()}


def compute(conn, cluster, **kw):
    with conn.cursor() as cur:
        args = ", ".join(f"{k} => %({k})s" for k in kw)
        cur.execute(f"select compute_matches(%(c)s{', ' + args if args else ''})", {"c": cluster, **kw})
        return cur.fetchone()[0]


def test_rules(db):
    conn, cl = db
    add(conn, cl, "florist", "florists")
    add(conn, cl, "photo", "photographers", lat_km=1)
    add(conn, cl, "planner", "wedding_planners", lat_km=2, locality="Draper")
    add(conn, cl, "giftshop", "flower_gift_shops", lat_km=0.5)          # competitor of florists
    add(conn, cl, "salon-unknown", "salons", lat_km=1)                   # broad, unconfirmed
    add(conn, cl, "salon-no", "salons", lat_km=1, serves=False)          # broad, confirmed not to serve weddings
    add(conn, cl, "photo-far", "photographers", lat_km=60)               # beyond 40 km
    add(conn, cl, "tires", "wedding_venues", lat_km=0.2, serves=False)    # miscategorized by Overture, marked by admin
    compute(conn, cl)

    m = matches(conn, "florist")
    assert set(m) == {"photo", "planner", "salon-unknown"}
    assert m["photo"]["reason_key"] == "day_of" and m["photo"]["partnership_type"] == "joint_offer"
    assert m["planner"]["reason_key"] == "hub_planner" and m["planner"]["c"] == pytest.approx(1.0)
    assert m["salon-unknown"]["c"] == pytest.approx(0.6 * 0.6)          # same_couple 0.6, broad x0.6
    assert m["photo"]["s"] == pytest.approx(0.75) and m["planner"]["s"] == pytest.approx(0.5)  # same locality
    assert m["photo"]["distance_m"] == pytest.approx(1000, rel=0.02)
    assert m["photo"]["score"] == pytest.approx(0.5 * 0.9 + 0.3 * m["photo"]["d"] + 0.2 * 0.75, rel=1e-4)
    assert "salon-no" not in matches(conn, "planner") and "tires" not in matches(conn, "photo")
    assert matches(conn, "tires") == {}
    assert matches(conn, "salon-no") == {}


def test_per_category_cap_top_n_and_recompute_preserves_decisions(db):
    conn, cl = db
    add(conn, cl, "planner", "wedding_planners")
    for i in range(5):
        add(conn, cl, f"photo{i}", "photographers", lat_km=i + 1)
    for i in range(3):
        add(conn, cl, f"florist{i}", "florists", lat_km=i + 1)
    compute(conn, cl, p_top=4, p_per_category=2)
    m = matches(conn, "planner")
    assert sorted(m) == ["florist0", "florist1", "photo0", "photo1"]

    # An approved match survives recomputation even when it no longer qualifies.
    with conn.cursor() as cur:
        cur.execute("""update matches set status = 'approved' where place_a = (select id from places where gers_id = 'planner')
                       and place_b = (select id from places where gers_id = 'photo1')""")
    compute(conn, cl, p_top=2, p_per_category=1)
    m = matches(conn, "planner")
    assert set(m) == {"florist0", "photo0", "photo1"} and m["photo1"]["status"] == "approved"
