import { sql } from "@/lib/db";

export type ClusterOutcome = {
  slug: string;
  name: string;
  listed: number;
  claimed: number;
  verified: number;
  members: number;
  requested: number;
  requested_30d: number;
  connected: number;
  declined: number;
  partnerships_proposed: number;
  partnerships_live: number;
  clicks: number;
};

/**
 * Per active metro: how far businesses have come (claimed → member) and what
 * the network produced (introductions, partnerships, tracking-link visits).
 * An introduction or partnership counts toward the metro of the business that asked.
 */
export async function clusterOutcomes(): Promise<ClusterOutcome[]> {
  return sql()<ClusterOutcome[]>`
    with metro as (select id, slug, name, cluster_box(cl) as box from clusters cl where scope = 'metro' and status = 'active'),
    p as (
      select m.slug, pl.id, pl.state from metro m
      join places pl on st_intersects(pl.geog, m.box)
      join categories c on c.id = pl.category_id
      where not pl.suppressed and not pl.stale and (not c.broad or pl.serves_journey or pl.state <> 'listed')
    ),
    intro as (
      select p.slug, i.* from introductions i join p on p.id = i.from_place
    ),
    part as (
      select intro.slug, pa.id, pa.stage from partnerships pa join intro on intro.id = pa.introduction_id
    )
    select m.slug, m.name,
      (select count(*)::int from p where p.slug = m.slug) as listed,
      (select count(*)::int from p where p.slug = m.slug and p.state = 'claimed') as claimed,
      (select count(*)::int from p where p.slug = m.slug and p.state = 'verified') as verified,
      (select count(*)::int from p where p.slug = m.slug and p.state = 'member') as members,
      (select count(*)::int from intro where intro.slug = m.slug) as requested,
      (select count(*)::int from intro where intro.slug = m.slug and intro.created_at > now() - interval '30 days') as requested_30d,
      (select count(*)::int from intro where intro.slug = m.slug and intro.status = 'connected') as connected,
      (select count(*)::int from intro where intro.slug = m.slug and intro.status = 'declined') as declined,
      (select count(*)::int from part where part.slug = m.slug and part.stage = 'proposed') as partnerships_proposed,
      (select count(*)::int from part where part.slug = m.slug and part.stage = 'live') as partnerships_live,
      (select coalesce(sum(l.clicks), 0)::int from partnership_links l join part on part.id = l.partnership_id where part.slug = m.slug) as clicks
    from metro m order by m.name`;
}
