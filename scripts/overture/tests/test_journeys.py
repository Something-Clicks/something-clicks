import json

import pytest

from sc_overture import journeys as J

DATA = J.load()
WEDDINGS = next(j for j in DATA["journeys"] if j["id"] == "weddings")


def by_pair(rows):
    return {(r.category_a, r.category_b): r for r in rows}


def test_taxonomy_values_map_once_and_cover_categories():
    m = J.taxonomy_map(DATA)
    assert m["wedding_planning"] == "wedding_planners"
    assert m["florist"] == "florists"
    assert set(m.values()) == {c["id"] for c in WEDDINGS["categories"]}


def test_duplicate_taxonomy_is_rejected():
    bad = json.loads(json.dumps(DATA))
    bad["journeys"][0]["categories"][1]["taxonomy"].append("florist")
    with pytest.raises(ValueError, match="mapped twice"):
        J.taxonomy_map(bad)


def test_name_rules_catch_vendors_filed_under_general_categories():
    rules = J.name_rules(DATA)

    def classify(name):
        return next((cid for cid, p in rules if p.search(name)), None)

    assert classify("Michael Scott Photography") == "photographers"
    assert classify("Diego's Catering") == "caterers"
    assert classify("Elite Party Rentals") == "event_rentals"
    assert classify("Sunbelt Rentals") is None  # equipment rental, not events
    assert classify("Wasatch Event Center") == "wedding_venues"
    assert classify("Sweet Cakes by Jen") == "cake_makers"
    assert classify("DJ Juggling And Magic") == "djs_music"


def test_complement_rules():
    c = by_pair(J.complements(WEDDINGS))
    # Hubs: everyone pairs with planners and venues, in both directions.
    assert c[("photographers", "wedding_planners")].reason_key == "hub_planner"
    assert c[("caterers", "wedding_venues")].reason_key == "hub_venue"
    assert c[("wedding_planners", "photographers")].reason_key == "hub_vendor"
    assert c[("wedding_planners", "photographers")].strength == 1.0
    # Day-of pairs are symmetric joint offers.
    assert c[("photographers", "florists")].relation == "day_of"
    assert c[("florists", "photographers")].partnership_type == "joint_offer"
    # Same couple at a different moment: direction follows stage order.
    assert c[("hair_makeup", "bridal_shops")].reason_key == "moment_before"
    assert c[("bridal_shops", "hair_makeup")].reason_key == "moment_after"
    # Everything else is a weaker distribution pairing.
    assert c[("limos", "stationers")].strength == 0.6


def test_competitors_and_same_category_never_match():
    c = by_pair(J.complements(WEDDINGS))
    assert ("photographers", "photographers") not in c
    assert ("hair_makeup", "salons") not in c and ("salons", "hair_makeup") not in c
    assert ("florists", "flower_gift_shops") not in c
    assert ("cake_makers", "bakeries") not in c


def test_every_pair_is_present_in_both_directions():
    c = by_pair(J.complements(WEDDINGS))
    assert all((b, a) in c for a, b in c)
    n = len(WEDDINGS["categories"])
    assert len(c) == n * (n - 1) - 2 * len(WEDDINGS["competitorPairs"])


def test_reason_keys_have_copy():
    keys = {r.reason_key for r in J.complements(WEDDINGS)}
    assert keys <= WEDDINGS["reasons"].keys()


def test_include_broad_filters_categories_and_rules():
    specific = J.taxonomy_map(DATA, "weddings", include_broad=False)
    assert "florist" in specific and "hair_salon" not in specific and "bakery" not in specific
    assert len(specific) == len(J.taxonomy_map(DATA, "weddings")) - 7  # salons 2, bakeries 2, jewelers 2, gift shops 1
    assert all(cid not in {"salons", "bakeries", "jewelers", "flower_gift_shops"}
               for cid, _ in J.name_rules(DATA, "weddings", include_broad=False))
