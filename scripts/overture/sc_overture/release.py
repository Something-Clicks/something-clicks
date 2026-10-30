"""Find the latest Overture release: STAC catalog first, S3 bucket listing as fallback."""

from __future__ import annotations

import re

import requests

BUCKET = "https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com"
STAC = "https://stac.overturemaps.org/catalog.json"
RELEASE_RE = re.compile(r"(\d{4}-\d{2}-\d{2}\.\d+)")


def _key(release: str) -> tuple:
    date, minor = release.split(".")
    return (date, int(minor))


def releases_from_stac(timeout: float = 15) -> list[str]:
    catalog = requests.get(STAC, timeout=timeout).json()
    found = {m.group(1) for link in catalog.get("links", []) for m in [RELEASE_RE.search(link.get("href", ""))] if m}
    return sorted(found, key=_key, reverse=True)


def releases_from_bucket(timeout: float = 30) -> list[str]:
    xml = requests.get(f"{BUCKET}/?list-type=2&prefix=release/&delimiter=/", timeout=timeout).text
    found = set(re.findall(r"<Prefix>release/(\d{4}-\d{2}-\d{2}\.\d+)/</Prefix>", xml))
    return sorted(found, key=_key, reverse=True)


def place_files(release: str, timeout: float = 30) -> list[str]:
    """HTTPS URLs of the places Parquet files in a release (empty if the theme is absent)."""
    xml = requests.get(
        f"{BUCKET}/?list-type=2&prefix=release/{release}/theme=places/type=place/", timeout=timeout
    ).text
    return [f"{BUCKET}/{k}" for k in re.findall(r"<Key>([^<]+\.parquet)</Key>", xml)]


def latest_release(log=print) -> str:
    """Newest release that actually contains the places theme."""
    try:
        candidates = releases_from_stac()
        source = "STAC catalog"
    except Exception as e:  # noqa: BLE001 - any failure falls back to the bucket listing
        log(f"STAC catalog unavailable ({type(e).__name__}); listing the S3 bucket instead.")
        candidates, source = releases_from_bucket(), "S3 bucket listing"
    for release in candidates:
        if place_files(release):
            log(f"Latest release with places: {release} (from {source})")
            return release
    raise SystemExit("No Overture release with a places theme was found.")
