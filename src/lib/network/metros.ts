import { sql } from "@/lib/db";

export type MetroCount = { category_id: string; n: number };

/**
 * Live counts of wedding businesses in a metro, by category. Broad categories
 * (salons, bakeries…) count only businesses confirmed to serve weddings.
 * Aggregates only: no names, ever.
 */
export async function metroCounts(clusterSlug: string): Promise<MetroCount[]> {
  return sql()<MetroCount[]>`
    select p.category_id, count(*)::int as n
    from clusters cl
    join places p on st_intersects(p.geog, cluster_box(cl))
    join categories c on c.id = p.category_id
    where cl.slug = ${clusterSlug} and cl.status = 'active'
      and not p.suppressed and not p.stale and (not c.broad or p.serves_journey)
    group by p.category_id
    order by n desc`;
}

/** Totals for every metro at once, for the index page. */
export async function metroTotals(): Promise<Record<string, number>> {
  const rows = await sql()<{ slug: string; n: number }[]>`
    select cl.slug, count(*)::int as n
    from clusters cl
    join places p on st_intersects(p.geog, cluster_box(cl))
    join categories c on c.id = p.category_id
    where cl.scope = 'metro' and cl.status = 'active'
      and not p.suppressed and not p.stale and (not c.broad or p.serves_journey)
    group by cl.slug`;
  return Object.fromEntries(rows.map((r) => [r.slug, r.n]));
}
