import pyarrow as pa

from sc_overture import journeys as J
from sc_overture.national import Aggregator
from tests.test_transform import place

DATA = J.load()


def table(rows):
    for r, zip_ in rows:
        r["addresses"][0]["postcode"] = zip_
    return pa.Table.from_pylist([r for r, _ in rows])


def test_counts_and_lookup():
    agg = Aggregator(J.taxonomy_map(DATA, "weddings"), [(c, p.pattern) for c, p in J.name_rules(DATA, "weddings")], 0.6)
    agg.add(table([
        (place("a", "Bloom", "florist", lat=40.60, lng=-111.90), "84070-1234"),
        (place("b", "Petal Co", "florist", lat=40.62, lng=-111.88), "84070"),
        (place("c", "Jen Smith Photography", "professional_service"), "84070"),   # name rule
        (place("d", "Gone Florist", "florist", status="permanently_closed"), "84070"),
        (place("e", "Maybe Florist", "florist", conf=0.3), "84070"),
        (place("f", "Joe's Tires", "tire_dealer_and_repair"), "84070"),
        (place("g", "Maple Florist", "florist", country="CA"), "84070"),
    ]))
    # A second batch accumulates.
    agg.add(table([(place("h", "Grand Hall", "event_venue", lat=40.7, lng=-111.9), "84101")]))
    assert agg.place_counts() == [("84070", "florists", 2), ("84070", "photographers", 1), ("84101", "wedding_venues", 1)]
    assert agg.us_rows == 7  # the Canadian row is excluded

    geo = {(g[0], g[1]): g for g in agg.geo_rows()}
    z = geo[("zcta", "84070")]  # 6 US rows in 84070 (all statuses count toward the center)
    assert z[3] == "84070" and round(z[4], 3) == round((40.60 + 40.62 + 40.65 * 4) / 6, 3)
    assert ("zcta", "84101") not in geo  # fewer than 3 places
    assert not any(k[0] == "place" for k in geo)  # cities need at least 10 places


def test_merge_combines_partial_aggregates():
    args = (J.taxonomy_map(DATA, "weddings"), [], 0.6)
    a, b, total = Aggregator(*args), Aggregator(*args), Aggregator(*args)
    a.add(table([(place("a", "Bloom", "florist"), "84070")] * 1))
    b.add(table([(place("b", "Petal", "florist"), "84070"), (place("c", "Hall", "event_venue"), "84101")]))
    total.merge(a)
    total.merge(b)
    assert total.us_rows == 3
    assert total.place_counts() == [("84070", "florists", 2), ("84101", "wedding_venues", 1)]
    assert total.zips["84070"][2] == 2
