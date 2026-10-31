import { cache } from "react";
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

/** Counts by category for every active metro, keyed by cluster slug. One query for the homepage tiles. */
export const allMetroCounts = cache(async (): Promise<Record<string, Record<string, number>>> => {
  const rows = await sql()<{ slug: string; category_id: string; n: number }[]>`
    select cl.slug, p.category_id, count(*)::int as n
    from clusters cl
    join places p on st_intersects(p.geog, cluster_box(cl))
    join categories c on c.id = p.category_id
    where cl.scope = 'metro' and cl.status = 'active'
      and not p.suppressed and not p.stale and (not c.broad or p.serves_journey)
    group by cl.slug, p.category_id`;
  const out: Record<string, Record<string, number>> = {};
  for (const r of rows) (out[r.slug] ??= {})[r.category_id] = r.n;
  return out;
});

export type ComplementRule = { a: string; b: string; reason_key: string; partnership_type: string; strength: number };

/** The matching rules between categories (no businesses), strongest first. Broad categories excluded. */
export const complementRules = cache(async (): Promise<ComplementRule[]> => {
  return sql()<ComplementRule[]>`
    select cm.category_a as a, cm.category_b as b, cm.reason_key, cm.partnership_type, cm.strength::float as strength
    from complements cm
    join categories ca on ca.id = cm.category_a
    join categories cb on cb.id = cm.category_b
    where not ca.broad and not cb.broad
    order by cm.category_a, cm.strength desc`;
});

/** A city × category page needs this many businesses of the category… */
export const MIN_CATEGORY_PAGE = 20;
/** …and at least this many partner categories with MIN_PARTNER businesses each. */
const MIN_PARTNER_CATEGORIES = 3;
const MIN_PARTNER = 10;

/** Whether there's enough real data for a city × category page. */
export function categoryPageEligible(counts: Record<string, number>, rules: ComplementRule[], categoryId: string): boolean {
  if ((counts[categoryId] ?? 0) < MIN_CATEGORY_PAGE) return false;
  return rules.filter((r) => r.a === categoryId && (counts[r.b] ?? 0) >= MIN_PARTNER).length >= MIN_PARTNER_CATEGORIES;
}
