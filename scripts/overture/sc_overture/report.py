"""Human-readable import report."""

from __future__ import annotations


def mb(n: int) -> str:
    return f"{n / 1024**2:,.1f} MB"


def format_report(r: dict) -> str:
    lines = [
        f"Cluster {r['cluster']} ({r.get('scope', 'metro')}, {'all' if r.get('include_broad', True) else 'wedding-specific'} categories)"
        f" · Overture release {r['release']} · run #{r['run_id']}",
        "",
        f"  Candidate rows read  {r['rows_read']:>8,}   (US, journey category or name match)",
        f"  Kept                 {r['rows_kept']:>8,}   ({r['new_places']:,} new to the database)",
    ]
    for reason, n in r["dropped"].items():
        lines.append(f"  Dropped: {reason:<11} {n:>8,}")
    lines += ["", "  Kept by category:"]
    lines += [f"    {c:<20} {n:>6,}" for c, n in r["by_category"].items()]
    lines += ["", "  Classified by: " + ", ".join(f"{k} {v:,}" for k, v in r["by_classifier"].items())]
    total = r["database_bytes_before"] + r["projected_bytes"]
    lines += [
        "",
        f"  Database now         {mb(r['database_bytes_before']):>10}",
        f"  This import adds     {mb(r['projected_bytes']):>10}   (places + room for matches)",
        f"  Projected total      {mb(total):>10}   budget {mb(r['budget_bytes'])}, free tier {mb(r['free_tier_bytes'])}",
        "  " + ("✓ Within budget." if r["within_budget"] else "✗ Over budget: Supabase Pro would be required."),
        "",
        "  Sample of kept businesses:",
    ]
    lines += [f"    {s['name'][:40]:<40} {s['category_id']:<18} {s['classified_by']:<10} {s['locality']}" for s in r["sample"]]
    if "load" in r:
        lines += ["", f"  Loaded: {r['load']}"]
    return "\n".join(lines)
