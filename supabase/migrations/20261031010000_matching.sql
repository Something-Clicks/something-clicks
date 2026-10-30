-- Matching engine (spec section 6).

create extension if not exists btree_gist;
--
-- score = 0.5 * C + 0.3 * D + 0.2 * S
--   C  complement strength from `complements`, x0.6 for each side in a broad
--      category whose wedding service is unconfirmed. Businesses marked as not
--      serving the journey (serves_journey = false) are excluded entirely.
--   D  exp(-distance / cluster.distance_scale_km), within cluster.max_match_km
--   S  service overlap: 0.75 when both list the same locality, else 0.5 (unknown)
--
-- Each business keeps its top p_top matches scoring at least p_min_score, with
-- at most p_per_category from any one category so the list stays varied.
-- Within a category, nearer is always better (C and S don't depend on distance
-- beyond locality), so candidates are the p_nearest closest of each
-- complementary category, found with a KNN index instead of scoring every pair.
-- Rows that admins or members have acted on (status other than 'suggested',
-- AI or edited rationale) are updated in place, never deleted.

create or replace function compute_matches(
  p_cluster bigint,
  p_top integer default 15,
  p_min_score real default 0.35,
  p_per_category integer default 3,
  p_nearest integer default 6
) returns integer
language plpgsql
set search_path = public
as $$
declare
  cl clusters;
  n integer;
begin
  select * into cl from clusters where id = p_cluster;
  if not found then
    raise exception 'cluster % not found', p_cluster;
  end if;

  drop table if exists cluster_places;
  create temp table cluster_places on commit drop as
    select pl.id, pl.category_id, pl.geog, lower(pl.locality) as locality, pl.serves_journey, c.broad
    from places pl join categories c on c.id = pl.category_id
    where p_cluster = any (pl.cluster_ids) and not pl.stale and not pl.suppressed
      and c.journey_id = cl.journey_id
      and pl.serves_journey is not false;  -- marked as not a wedding business (admin, owner, or AI)
  create index on cluster_places using gist (category_id, geog);
  analyze cluster_places;

  drop table if exists candidate;
  create temp table candidate on commit drop as
  with pairs as (
    select a.id as place_a, b.id as place_b, b.category_id as b_category,
           cm.strength * (case when a.broad and a.serves_journey is null then 0.6 else 1 end)
                       * (case when b.broad and b.serves_journey is null then 0.6 else 1 end) as c,
           b.distance_m,
           case when a.locality <> '' and a.locality = b.locality then 0.75 else 0.5 end as s,
           cm.partnership_type, cm.reason_key
    from cluster_places a
    join complements cm on cm.category_a = a.category_id
    cross join lateral (
      -- Spherical math (use_spheroid = false) is accurate to ~0.3% and far cheaper.
      select x.id, x.category_id, x.locality, x.serves_journey, x.broad, st_distance(a.geog, x.geog, false) as distance_m
      from cluster_places x
      where x.category_id = cm.category_b and x.id <> a.id
        and st_dwithin(a.geog, x.geog, cl.max_match_km * 1000, false)
      order by x.geog <-> a.geog
      limit p_nearest
    ) b
  ),
  scored as (
    select *, exp(-(distance_m / 1000.0) / cl.distance_scale_km) as d
    from pairs
  ),
  final as (
    select *, (0.5 * c + 0.3 * d + 0.2 * s)::real as score from scored
  ),
  per_category as (
    select *, row_number() over (partition by place_a, b_category order by score desc, distance_m, place_b) as rn_cat
    from final where score >= p_min_score
  ),
  ranked as (
    select *, row_number() over (partition by place_a order by score desc, distance_m, place_b) as rn
    from per_category where rn_cat <= p_per_category
  )
  select place_a, place_b, score, c::real, d::real, s::real, round(distance_m)::integer as distance_m,
         partnership_type, reason_key
  from ranked where rn <= p_top;

  insert into matches (place_a, place_b, cluster_id, score, c, d, s, distance_m, partnership_type, reason_key)
  select place_a, place_b, p_cluster, score, c, d, s, distance_m, partnership_type, reason_key from candidate
  on conflict (place_a, place_b) do update set
    cluster_id = excluded.cluster_id,
    score = excluded.score, c = excluded.c, d = excluded.d, s = excluded.s,
    distance_m = excluded.distance_m, reason_key = excluded.reason_key,
    -- An admin's choice of partnership type survives recomputation once acted on.
    partnership_type = case when matches.status = 'suggested' then excluded.partnership_type else matches.partnership_type end;

  -- Drop untouched suggestions that no longer qualify.
  delete from matches m
  where m.cluster_id = p_cluster and m.status = 'suggested' and m.ai_rationale is null and not m.rationale_edited
    and not exists (select 1 from candidate c where c.place_a = m.place_a and c.place_b = m.place_b);

  select count(*) into n from candidate;
  return n;
end;
$$;

revoke execute on function compute_matches(bigint, integer, real, integer, integer) from public, anon, authenticated;
