"""Job/cluster validation: runs before any database work, using journeys.json."""

import subprocess
import sys

import pytest

from sc_overture.inputs import InputError, resolve

DATA = {
    "clusters": [
        {"slug": "us-weddings", "scope": "national"},
        {"slug": "dfw-weddings", "scope": "metro"},
        {"slug": "atl-weddings", "scope": "metro"},
    ]
}


def test_defaults_per_job():
    assert resolve("matches", "default", DATA) == "dfw-weddings"
    assert resolve("matches", "", DATA) == "dfw-weddings"
    assert resolve("import", "default", DATA) == "us-weddings"
    assert resolve("migrate", "default", DATA) is None
    assert resolve("national", None, DATA) is None


def test_explicit_clusters():
    assert resolve("matches", "atl-weddings", DATA) == "atl-weddings"
    assert resolve("import", "dfw-weddings", DATA) == "dfw-weddings"


def test_national_cluster_cannot_be_matched():
    with pytest.raises(InputError, match="per metro.*us-weddings is a national import cluster.*dfw-weddings, atl-weddings"):
        resolve("matches", "us-weddings", DATA)


def test_invalid_combinations():
    with pytest.raises(InputError, match="Unknown cluster 'dfw-wedings'"):
        resolve("matches", "dfw-wedings", DATA)
    with pytest.raises(InputError, match="Unknown cluster"):
        resolve("import", "nowhere", DATA)
    with pytest.raises(InputError, match="doesn't use a cluster"):
        resolve("national", "dfw-weddings", DATA)
    with pytest.raises(InputError, match="doesn't use a cluster"):
        resolve("migrate", "us-weddings", DATA)
    with pytest.raises(InputError, match="Unknown job"):
        resolve("export", "default", DATA)


def test_unknown_metro_allowed_only_when_asked():
    assert resolve("matches", "admin-made-metro", DATA, allow_unknown=True) == "admin-made-metro"
    with pytest.raises(InputError):
        resolve("matches", "us-weddings", DATA, allow_unknown=True)  # known national is still refused


def test_repo_clusters_and_workflow_options_agree():
    """Every cluster the workflow offers exists in journeys.json, and us-weddings is the only national one."""
    from pathlib import Path

    import yaml

    from sc_overture.journeys import load

    wf = yaml.safe_load((Path(__file__).resolve().parents[3] / ".github/workflows/overture-import.yml").read_text())
    inputs = wf[True]["workflow_dispatch"]["inputs"] if True in wf else wf["on"]["workflow_dispatch"]["inputs"]
    offered = [o for o in inputs["cluster"]["options"] if o != "default"]
    clusters = {c["slug"]: c.get("scope") for c in load()["clusters"]}
    assert inputs["cluster"]["default"] == "default"
    assert set(offered) == set(clusters)
    assert [s for s, scope in clusters.items() if scope == "national"] == ["us-weddings"]


@pytest.mark.parametrize("args, ok, out", [
    (["--job", "matches"], True, "dfw-weddings"),
    (["--job", "matches", "--cluster", "us-weddings"], False, "national import cluster"),
    (["--job", "import", "--cluster", "default"], True, "us-weddings"),
    (["--job", "national", "--cluster", "dfw-weddings"], False, "doesn't use a cluster"),
])
def test_cli_check_inputs_needs_no_database(args, ok, out, monkeypatch):
    env = {"PATH": "/usr/bin:/bin"}  # no SUPABASE_DB_URL: proves nothing connects
    r = subprocess.run([sys.executable, "-m", "sc_overture", "check-inputs", *args], capture_output=True, text=True, env=env)
    assert (r.returncode == 0) is ok
    assert out in (r.stdout + r.stderr)


def test_cli_matches_rejects_national_before_connecting():
    r = subprocess.run([sys.executable, "-m", "sc_overture", "matches", "us-weddings"], capture_output=True, text=True, env={"PATH": "/usr/bin:/bin"})
    assert r.returncode != 0
    assert "national import cluster" in r.stderr
    assert "SUPABASE_DB_URL" not in r.stderr  # failed on the input, not on a missing connection
