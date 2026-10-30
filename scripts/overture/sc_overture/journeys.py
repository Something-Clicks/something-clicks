"""Journey map loading and complement generation (from src/content/journeys.json)."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

JOURNEYS_PATH = Path(__file__).resolve().parents[3] / "src" / "content" / "journeys.json"


@dataclass(frozen=True)
class Complement:
    category_a: str
    category_b: str
    strength: float
    relation: str
    reason_key: str
    partnership_type: str


def load(path: Path = JOURNEYS_PATH) -> dict:
    return json.loads(path.read_text())


def taxonomy_map(data: dict) -> dict[str, str]:
    """Overture taxonomy.primary value -> category id, across active journeys."""
    out: dict[str, str] = {}
    for j in data["journeys"]:
        if not j.get("active"):
            continue
        for c in j["categories"]:
            for t in c["taxonomy"]:
                if t in out:
                    raise ValueError(f"taxonomy value {t!r} mapped twice ({out[t]}, {c['id']})")
                out[t] = c["id"]
    return out


def name_rules(data: dict) -> list[tuple[str, re.Pattern[str]]]:
    """Ordered (category id, compiled pattern) pairs, applied when taxonomy doesn't map."""
    return [
        (c["id"], re.compile(c["nameRule"], re.IGNORECASE))
        for j in data["journeys"]
        if j.get("active")
        for c in j["categories"]
        if c.get("nameRule")
    ]


def complements(journey: dict) -> list[Complement]:
    """Directional complements for every ordered category pair in a journey."""
    cats = {c["id"]: c for c in journey["categories"]}
    stage_pos = {s["id"]: i for i, s in enumerate(journey["stages"])}
    pair = lambda a, b: frozenset((a, b))  # noqa: E731
    day_of = {pair(*p) for p in journey.get("dayOfPairs", [])}
    same_couple = {pair(*p) for p in journey.get("sameCouplePairs", [])}
    competitors = {pair(*p) for p in journey.get("competitorPairs", [])}
    for p in day_of | same_couple | competitors:
        unknown = p - cats.keys()
        if unknown:
            raise ValueError(f"unknown category in pair: {sorted(unknown)}")

    out: list[Complement] = []
    for a, ca in cats.items():
        for b, cb in cats.items():
            if a == b or pair(a, b) in competitors:
                continue
            if cb.get("hub") == "planner":
                out.append(Complement(a, b, 1.0, "hub", "hub_planner", "referral"))
            elif cb.get("hub") == "venue":
                out.append(Complement(a, b, 1.0, "hub", "hub_venue", "referral"))
            elif ca.get("hub"):
                out.append(Complement(a, b, 1.0, "hub", "hub_vendor", "referral"))
            elif pair(a, b) in day_of:
                out.append(Complement(a, b, 0.9, "day_of", "day_of", "joint_offer"))
            elif pair(a, b) in same_couple:
                pa, pb = stage_pos[ca["stage"]], stage_pos[cb["stage"]]
                key = "moment_before" if pb < pa else "moment_after" if pb > pa else "same_couple"
                out.append(Complement(a, b, 0.7, "moment", key, "referral"))
            else:
                out.append(Complement(a, b, 0.6, "same_couple", "same_couple", "distribution"))
    return out
