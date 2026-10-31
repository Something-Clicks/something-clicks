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

export type CityClaims = { city: string; region: string; in_metro: boolean; claims: number; verified: number; pending: number };

/**
 * Claims (pending or approved) grouped by the business's city, inside or
 * outside the active metros: where owners are asking to join.
 */
export async function claimsByCity(limit = 50): Promise<CityClaims[]> {
  return sql()<CityClaims[]>`
    with c as (
      select pc.status,
             coalesce(nullif(p.locality, ''), pc.new_business->>'locality', '') as city,
             coalesce(nullif(p.region, ''), pc.new_business->>'region', '') as region,
             coalesce(p.geog, st_setsrid(st_makepoint((pc.new_business->>'lng')::float, (pc.new_business->>'lat')::float), 4326)::geography) as geog
      from place_claims pc left join places p on p.id = pc.place_id
      where pc.status in ('pending', 'approved')
    )
    select initcap(city) as city, upper(region) as region,
           exists (select 1 from clusters cl where cl.scope = 'metro' and cl.status = 'active' and st_intersects(c.geog, cluster_box(cl))) as in_metro,
           count(*)::int as claims,
           count(*) filter (where status = 'approved')::int as verified,
           count(*) filter (where status = 'pending')::int as pending
    from c
    group by 1, 2, 3
    order by in_metro, claims desc, city
    limit ${limit}`;
}
