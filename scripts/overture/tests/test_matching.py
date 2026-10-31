"""compute_matches() rules against a real PostGIS database (TEST_DATABASE_URL); rolled back."""

import os

import psycopg
import pytest

from sc_overture.seed import seed

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")

KM = 1 / 111.0  # ~1 km of latitude


@pytest.fixture
def db():
    with psycopg.connect(URL) as c:
        seed(c)
        # Metro membership is by location: use an empty patch of the Pacific, far from any loaded data.
        with c.cursor() as cur:
            cur.execute("""insert into clusters (slug, name, journey_id, min_lng, min_lat, max_lng, max_lat, center)
                           values ('test-match', 'Test', 'weddings', -141, 9, -139, 11, st_makepoint(-140, 10)::geography)
                           returning id""")
            cluster = cur.fetchone()[0]
        yield c, cluster
        c.rollback()


def add(conn, cluster, gers, category, lat_km=0.0, locality="Sandy", serves=None):
    # Direct insert: these tests exercise matching, not the loader (each load would
    # mark the cluster's earlier rows stale).
    with conn.cursor() as cur:
        cur.execute(
            """insert into places (gers_id, release, name, category_id, locality, geog, cluster_ids, serves_journey)
               values (%s, 'r1', %s, %s, %s, st_setsrid(st_makepoint(-140.0, %s), 4326)::geography, array[%s]::bigint[], %s)""",
            (gers, gers, category, locality, 10.0 + lat_km * KM, cluster, serves),
        )


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
    add(conn, cl, "photo-far", "photographers", lat_km=60)               # beyond 40 km (still inside the box)
    add(conn, cl, "tires", "wedding_venues", lat_km=0.2, serves=False)    # miscategorized by Overture, marked by admin
    compute(conn, cl)

    m = matches(conn, "florist")
    assert set(m) == {"photo", "planner"}  # unconfirmed broad businesses aren't matched by default
    assert matches(conn, "salon-unknown") == {}
    assert m["photo"]["reason_key"] == "day_of" and m["photo"]["partnership_type"] == "joint_offer"
    assert m["planner"]["reason_key"] == "hub_planner" and m["planner"]["c"] == pytest.approx(1.0)
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


def test_national_clusters_are_never_matched_as_a_whole(db):
    conn, _ = db
    with conn.cursor() as cur:
        cur.execute("""insert into clusters (slug, name, journey_id, scope, min_lng, min_lat, max_lng, max_lat, center)
                       values ('test-national', 'T', 'weddings', 'national', -170, 18, -66, 72, st_makepoint(-98, 39)::geography)
                       returning id""")
        nat = cur.fetchone()[0]
    with pytest.raises(psycopg.errors.RaiseException, match="per metro"):
        compute(conn, nat)


def test_broad_businesses_match_once_confirmed_or_when_metro_allows(db):
    conn, cl = db
    add(conn, cl, "florist", "florists")
    add(conn, cl, "salon-yes", "salons", lat_km=1, serves=True)
    add(conn, cl, "salon-unknown", "salons", lat_km=1)
    compute(conn, cl)
    m = matches(conn, "florist")
    assert set(m) == {"salon-yes"} and m["salon-yes"]["c"] == pytest.approx(0.6)  # confirmed: full strength

    with conn.cursor() as cur:
        cur.execute("update clusters set match_unconfirmed_broad = true where id = %s", (cl,))
    compute(conn, cl)
    m = matches(conn, "florist")
    assert set(m) == {"salon-yes", "salon-unknown"}
    assert m["salon-unknown"]["c"] == pytest.approx(0.6 * 0.6)  # unconfirmed: x0.6


def add_listing(conn, cluster, gers, category, name, taxonomy, lat_km=0.0, serves=None):
    with conn.cursor() as cur:
        cur.execute(
            """insert into places (gers_id, release, name, category_id, taxonomy_primary, locality, geog, cluster_ids, serves_journey)
               values (%s, 'r1', %s, %s, %s, 'Sandy', st_setsrid(st_makepoint(-140.0, %s), 4326)::geography, array[%s]::bigint[], %s)""",
            (gers, name, category, taxonomy, 10.0 + lat_km * KM, cluster, serves),
        )


def test_generic_sources_and_chains_match_only_once_confirmed(db):
    """Wedding-specific categories fed by generic map-data sources, or chain names, wait for confirmation."""
    conn, cl = db
    add_listing(conn, cl, "photo", "photographers", "Lens & Lace Photography", "event_photography_service")
    add_listing(conn, cl, "planner-wedding", "wedding_planners", "Bliss Weddings", "wedding_planning", lat_km=1)
    add_listing(conn, cl, "planner-party", "wedding_planners", "Bounce House Parties", "party_and_event_planning", lat_km=1)
    add_listing(conn, cl, "caterer-restaurant", "caterers", "Taqueria Sol", "mexican_restaurant", lat_km=1)  # %restaurant
    add_listing(conn, cl, "caterer-chain", "caterers", "Ben & Jerry's", "caterer", lat_km=1)
    add_listing(conn, cl, "caterer-ok", "caterers", "Smith Catering", "caterer", lat_km=1)
    add_listing(conn, cl, "planner-party-yes", "wedding_planners", "Big Day Events", "party_and_event_planning", lat_km=1, serves=True)
    compute(conn, cl)
    assert set(matches(conn, "photo")) == {"planner-wedding", "caterer-ok", "planner-party-yes"}

    with conn.cursor() as cur:  # still counted: nothing is deleted or hidden, only held back from matching
        cur.execute("select count(*) from places where gers_id in ('planner-party', 'caterer-restaurant', 'caterer-chain') and not suppressed")
        assert cur.fetchone()[0] == 3
        cur.execute("""select gers_id, needs_confirmation(category_id, taxonomy_primary, name) from places
                       where gers_id in ('planner-wedding', 'planner-party', 'caterer-restaurant', 'caterer-chain', 'caterer-ok') order by gers_id""")
        assert dict(cur.fetchall()) == {"caterer-chain": True, "caterer-ok": False, "caterer-restaurant": True,
                                        "planner-party": True, "planner-wedding": False}

    with conn.cursor() as cur:  # confirmation (AI review, owner or admin) is what lets one match
        cur.execute("update places set serves_journey = true where gers_id = 'caterer-restaurant'")
    compute(conn, cl)
    assert "caterer-restaurant" in matches(conn, "photo")


def test_seed_writes_the_review_lists(db):
    conn, _ = db
    with conn.cursor() as cur:
        cur.execute("select unconfirmed_taxonomy from categories where id = 'wedding_planners'")
        assert "party_and_event_planning" in cur.fetchone()[0]
        cur.execute("select unconfirmed_name_pattern from journeys where id = 'weddings'")
        assert "party city" in cur.fetchone()[0]
