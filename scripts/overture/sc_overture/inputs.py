"""Validate a job/cluster combination before anything touches the database.

Clusters are defined in src/content/journeys.json (the seed source). The
workflow's cluster input may be "default", which means the usual cluster
for the job: the national import for `import`, Dallas–Fort Worth for `matches`.
"""

from __future__ import annotations

from .journeys import load

JOBS = ("migrate", "import", "national", "matches")
DEFAULTS = {"import": "us-weddings", "matches": "dfw-weddings"}
NO_CLUSTER = ("migrate", "national")


class InputError(ValueError):
    pass


def resolve(job: str, cluster: str | None, data: dict | None = None, *, allow_unknown: bool = False) -> str | None:
    """The cluster slug the job should use (None when the job takes none), or InputError with what to choose instead."""
    if job not in JOBS:
        raise InputError(f"Unknown job {job!r}. Choose one of: {', '.join(JOBS)}.")
    chosen = (cluster or "").strip()
    if job in NO_CLUSTER:
        if chosen not in ("", "default"):
            raise InputError(f"The {job} job doesn't use a cluster; leave cluster as \"default\" (you chose {chosen!r}).")
        return None

    slug = DEFAULTS[job] if chosen in ("", "default") else chosen
    clusters = {c["slug"]: c for c in (data or load()).get("clusters", [])}
    metros = [s for s, c in clusters.items() if c.get("scope", "metro") == "metro"]
    if slug not in clusters:
        if allow_unknown:
            return slug  # e.g. a cluster created in the admin; the database checks it
        raise InputError(f"Unknown cluster {slug!r}. Known clusters: {', '.join(clusters)}.")
    if job == "matches" and clusters[slug].get("scope") == "national":
        raise InputError(
            f"Matches are generated per metro, and {slug} is a national import cluster. "
            f"Choose a metro instead: {', '.join(metros)} (or leave cluster as \"default\" for {DEFAULTS['matches']})."
        )
    return slug
