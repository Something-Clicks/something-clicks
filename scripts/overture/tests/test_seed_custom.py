"""Seeding from journeys.json keeps what admins added: synonyms, custom categories and their pairs."""

import os

import psycopg
import pytest

from sc_overture.load import custom_taxonomy
from sc_overture.seed import seed

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")


@pytest.fixture
def db():
    with psycopg.connect(URL) as c:
        seed(c)
        yield c
        # seed() commits, so clean up by hand.
        with c.cursor() as cur:
            cur.execute("delete from complements where category_a = 'test_officiants' or category_b = 'test_officiants'")
            cur.execute("delete from categories where id = 'test_officiants'")
            cur.execute("update categories set extra_synonyms = '{}' where id = 'event_rentals'")
        c.commit()


def test_seed_keeps_admin_additions(db):
    with db.cursor() as cur:
        cur.execute("update categories set extra_synonyms = array['photo booth rental'] where id = 'event_rentals'")
        cur.execute("""insert into categories (id, journey_id, stage_id, label, plural, broad, taxonomy, synonyms, custom)
                       values ('test_officiants', 'weddings', 'weddings.week', 'Officiant', 'officiants', false, array['test_officiant'], '{}', true)""")
        cur.execute("""insert into complements (category_a, category_b, strength, relation, reason_key, partnership_type, source)
                       values ('test_officiants', 'wedding_planners', 1, 'hub', 'hub_planner', 'referral', 'admin'),
                              ('wedding_planners', 'test_officiants', 1, 'hub', 'hub_vendor', 'referral', 'admin')""")
    db.commit()

    seed(db)

    with db.cursor() as cur:
        cur.execute("select extra_synonyms from categories where id = 'event_rentals'")
        assert cur.fetchone()[0] == ["photo booth rental"]
        cur.execute("select count(*) from complements where source = 'admin' and 'test_officiants' in (category_a, category_b)")
        assert cur.fetchone()[0] == 2
        cur.execute("select count(*) from complements where source = 'journey'")
        assert cur.fetchone()[0] == 266
    assert custom_taxonomy(db, "weddings") == {"test_officiant": "test_officiants"}
