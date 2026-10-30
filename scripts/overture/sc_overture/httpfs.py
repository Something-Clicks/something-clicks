"""HTTP filesystem for reading Overture Parquet over range requests."""

from __future__ import annotations


def http_fs():
    import aiohttp
    import fsspec

    # A dropped connection must fail fast and be retried, never hang an import.
    timeout = aiohttp.ClientTimeout(total=None, sock_connect=30, sock_read=60)
    return fsspec.filesystem("http", client_kwargs={"trust_env": True, "timeout": timeout})
