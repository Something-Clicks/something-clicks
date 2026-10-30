from pathlib import Path

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from sc_overture import journeys as J
from sc_overture.transform import Suppression, transform

BBOX = (-112.2, 40.4, -111.7, 40.85)
DATA = J.load()
TAX = J.taxonomy_map(DATA)
RULES = [(c, p.pattern) for c, p in J.name_rules(DATA)]


def place(gers, name, tax=None, conf=0.9, status="open", lng=-111.89, lat=40.65, country="US",
          website=None, phone=None, email=None, sources=("meta",)):
    return {
        "id": gers,
        "names": {"primary": name},
        "basic_category": None,
        "taxonomy": {"primary": tax, "hierarchy": [tax] if tax else []},
        "confidence": conf,
        "operating_status": status,
        "websites": [website] if website else None,
        "phones": [phone] if phone else None,
        "emails": [email] if email else None,
        "addresses": [{"freeform": "1 Main St", "locality": "Sandy", "postcode": "84070", "region": "UT", "country": country}],
        "sources": [{"dataset": s, "record_id": "x", "license": "CDLA-Permissive-2.0"} for s in sources],
        "bbox": {"xmin": lng, "xmax": lng, "ymin": lat, "ymax": lat},
    }


ROWS = [
    place("g-florist", "Bloom & Co", "florist", website="https://www.bloomco.com/weddings", phone="(801) 555-0101",
          email="Hello@BloomCo.com", sources=("meta", "Microsoft")),
    place("g-photo", "Michael Scott Photography", "professional_service", phone="801-555-0102"),
    place("g-outside", "Far Away Florist", "florist", lng=-100.0),
    place("g-canada", "Maple Florist", "florist", country="CA"),
    place("g-closed", "Gone Catering", "caterer", status="permanently_closed"),
    place("g-lowconf", "Maybe Venue", "event_venue", conf=0.4),
    place("g-junk", "123", "florist"),
    place("g-unmapped", "Joe's Tires", "tire_dealer_and_repair"),
    place("g-equipment", "Sunbelt Rentals", "rental_service"),
    place("g-supp", "Removed Bakery", "bakery"),
    place("g-supdomain", "Blocked Cakes", "patisserie_cake_shop", website="http://blocked.example"),
    # Same name within ~20 m: the lower-confidence one is the duplicate.
    place("g-dj-a", "Party Time DJ", "dj_service", conf=0.95),
    place("g-dj-b", "Party Time D.J.", "dj_service", conf=0.7, lng=-111.89015),
    # Same name but ~3 km apart: both kept.
    place("g-cater-a", "Sunrise Catering", "caterer", lat=40.60),
    place("g-cater-b", "Sunrise Catering", "caterer", lat=40.63),
    # Different names, same domain + phone within 150 m: duplicate.
    place("g-venue-a", "The Grand Ballroom", "event_venue", conf=0.8, website="https://grand.example", phone="8015550199"),
    place("g-venue-b", "Grand Ballroom Events", "event_venue", conf=0.9, website="https://www.grand.example/about",
          phone="+1 801 555 0199", lat=40.651),
]


@pytest.fixture(scope="module")
def result(tmp_path_factory) -> object:
    path = Path(tmp_path_factory.mktemp("x")) / "extract.parquet"
    pq.write_table(pa.Table.from_pylist(ROWS), path)
    sup = Suppression(gers_ids={"g-supp"}, domains={"blocked.example"})
    return transform(path, BBOX, 0.6, TAX, RULES, sup)


def kept(result):
    return {r["gers_id"]: r for r in result.kept}


def test_every_row_is_kept_or_dropped_exactly_once(result):
    assert result.rows_read == len(ROWS)
    assert len(result.kept) + sum(result.dropped.values()) == len(ROWS)


def test_drop_reasons(result):
    assert result.dropped == {
        "outside": 1, "not_us": 1, "closed": 1, "low_confidence": 1, "junk": 1,
        "unmapped": 2, "suppressed": 2, "duplicate": 2,
    }


def test_classification_by_taxonomy_and_name_rule(result):
    k = kept(result)
    assert k["g-florist"]["category_id"] == "florists" and k["g-florist"]["classified_by"] == "taxonomy"
    assert k["g-photo"]["category_id"] == "photographers" and k["g-photo"]["classified_by"] == "name_rule"
    assert "g-equipment" not in k  # "Rentals" alone doesn't make an event rental company
    assert result.by_classifier == {"taxonomy": 5, "name_rule": 1}


def test_normalization(result):
    f = kept(result)["g-florist"]
    assert f["website"] == "https://www.bloomco.com"
    assert f["phone"] == "+18015550101"
    assert f["email"] == "hello@bloomco.com"
    assert (f["street"], f["locality"], f["region"], f["postcode"]) == ("1 Main St", "Sandy", "UT", "84070")
    assert sorted(f["source_datasets"]) == ["Microsoft", "meta"]
    assert kept(result)["g-photo"]["phone"] == "+18015550102"


def test_deduplication_keeps_higher_confidence_and_records_merges(result):
    k = kept(result)
    assert "g-dj-a" in k and "g-dj-b" not in k
    assert k["g-dj-a"]["merged_gers_ids"] == ["g-dj-b"]
    assert "g-cater-a" in k and "g-cater-b" in k
    assert "g-venue-b" in k and "g-venue-a" not in k
    assert k["g-venue-b"]["merged_gers_ids"] == ["g-venue-a"]


def test_prefilter_keeps_us_journey_rows_only():
    import pyarrow.compute as pc

    from sc_overture.extract import Prefilter, prefilter_mask

    rows = [
        place("keep-tax", "Bloom", "florist"),
        place("keep-name", "Jen Smith Photography", "professional_service"),
        place("drop-tax", "Joe's Tires", "tire_dealer_and_repair"),
        place("drop-ca", "Maple Florist", "florist", country="CA"),
        place("drop-box", "Far Florist", "florist", lng=-80.0),
    ]
    t = pa.Table.from_pylist(rows)
    pf = Prefilter(frozenset(TAX), "|".join(f"(?:{p})" for _, p in RULES))
    kept = t.filter(prefilter_mask(t, [BBOX], pf))
    assert kept["id"].to_pylist() == ["keep-tax", "keep-name"]
    assert pc.sum(prefilter_mask(t, [BBOX, (-81, 40, -79, 41)], pf)).as_py() == 3
