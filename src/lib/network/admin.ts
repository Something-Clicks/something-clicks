import { sql } from "@/lib/db";

export type ClusterRow = {
  id: number;
  slug: string;
  name: string;
  journey_id: string;
  scope: "metro" | "national";
  include_broad: boolean;
  match_unconfirmed_broad: boolean;
  status: string;
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
  distance_scale_km: number;
  max_match_km: number;
  min_confidence: number;
  listed: number;
  claimed: number;
  verified: number;
  member: number;
  stale: number;
  matches: number;
  approved: number;
  hidden: number;
};

export async function listClusters(): Promise<ClusterRow[]> {
  return sql()<ClusterRow[]>`
    select c.id::int, c.slug, c.name, c.journey_id, c.scope, c.include_broad, c.match_unconfirmed_broad, c.status,
           c.min_lng, c.min_lat, c.max_lng, c.max_lat, c.distance_scale_km, c.max_match_km, c.min_confidence,
           s.listed, s.claimed, s.verified, s.member, s.stale,
           (select count(*) from matches m where m.cluster_id = c.id)::int as matches,
           (select count(*) from matches m where m.cluster_id = c.id and m.status = 'approved')::int as approved,
           (select count(*) from matches m where m.cluster_id = c.id and m.status = 'hidden')::int as hidden
    from clusters c
    -- Metros contain every business inside their box; a national cluster is its import scope.
    cross join lateral (
      select count(*) filter (where p.state = 'listed' and not p.stale)::int as listed,
             count(*) filter (where p.state = 'claimed')::int as claimed,
             count(*) filter (where p.state = 'verified')::int as verified,
             count(*) filter (where p.state = 'member')::int as member,
             count(*) filter (where p.stale)::int as stale
      from places p
      where (c.scope = 'metro' and st_intersects(p.geog, cluster_box(c)))
         or (c.scope = 'national' and c.id = any (p.cluster_ids))
    ) s
    order by c.scope desc, c.name`;
}

export async function getCluster(id: number) {
  const [row] = await sql()<ClusterRow[]>`
    select id::int, slug, name, journey_id, scope, include_broad, match_unconfirmed_broad, status, min_lng, min_lat, max_lng, max_lat,
           distance_scale_km, max_match_km, min_confidence
    from clusters where id = ${id}`;
  return row ?? null;
}

export async function listJourneys() {
  return sql()<{ id: string; name: string; active: boolean }[]>`select id, name, active from journeys order by name`;
}

export type ClusterInput = {
  slug: string;
  name: string;
  journey_id: string;
  scope: "metro" | "national";
  include_broad: boolean;
  match_unconfirmed_broad: boolean;
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
  distance_scale_km: number;
  max_match_km: number;
  min_confidence: number;
  status: string;
};

export async function saveCluster(id: number | null, c: ClusterInput): Promise<number> {
  const centerLng = (c.min_lng + c.max_lng) / 2;
  const centerLat = (c.min_lat + c.max_lat) / 2;
  const db = sql();
  if (id === null) {
    const [row] = await db<{ id: number }[]>`
      insert into clusters (slug, name, journey_id, scope, include_broad, match_unconfirmed_broad, min_lng, min_lat,
                            max_lng, max_lat, center, distance_scale_km, max_match_km, min_confidence, status)
      values (${c.slug}, ${c.name}, ${c.journey_id}, ${c.scope}, ${c.include_broad}, ${c.match_unconfirmed_broad}, ${c.min_lng}, ${c.min_lat}, ${c.max_lng}, ${c.max_lat},
              st_setsrid(st_makepoint(${centerLng}, ${centerLat}), 4326)::geography,
              ${c.distance_scale_km}, ${c.max_match_km}, ${c.min_confidence}, ${c.status})
      returning id::int`;
    return row.id;
  }
  await db`
    update clusters set slug = ${c.slug}, name = ${c.name}, journey_id = ${c.journey_id},
      scope = ${c.scope}, include_broad = ${c.include_broad}, match_unconfirmed_broad = ${c.match_unconfirmed_broad},
      min_lng = ${c.min_lng}, min_lat = ${c.min_lat}, max_lng = ${c.max_lng}, max_lat = ${c.max_lat},
      center = st_setsrid(st_makepoint(${centerLng}, ${centerLat}), 4326)::geography,
      distance_scale_km = ${c.distance_scale_km}, max_match_km = ${c.max_match_km},
      min_confidence = ${c.min_confidence}, status = ${c.status}
    where id = ${id}`;
  return id;
}

export async function recomputeMatches(clusterId: number): Promise<number> {
  const [row] = await sql()<{ n: number }[]>`select compute_matches(${clusterId})::int as n`;
  return row.n;
}

export type ImportRun = {
  id: number;
  cluster_slug: string | null;
  kind: string;
  mode: string;
  release: string | null;
  status: string;
  rows_read: number | null;
  rows_kept: number | null;
  dropped: Record<string, number>;
  by_category: Record<string, number>;
  projected_bytes: number | null;
  database_bytes_before: number | null;
  message: string;
  started_at: Date;
  finished_at: Date | null;
};

export async function listImportRuns(limit = 50): Promise<ImportRun[]> {
  return sql()<ImportRun[]>`
    select r.id::int, c.slug as cluster_slug, r.kind, r.mode, r.release, r.status, r.rows_read, r.rows_kept,
           r.dropped, r.by_category, r.projected_bytes::float8 as projected_bytes,
           r.database_bytes_before::float8 as database_bytes_before, r.message, r.started_at, r.finished_at
    from import_runs r left join clusters c on c.id = r.cluster_id
    order by r.started_at desc limit ${limit}`;
}

export type PlaceSummary = {
  id: number;
  name: string;
  category_id: string;
  category_label: string;
  broad: boolean;
  state: string;
  locality: string;
  classified_by: string;
  matches: number;
};

export async function searchPlaces(clusterId: number, q: string, category: string): Promise<PlaceSummary[]> {
  const term = q.trim().slice(0, 100);
  return sql()<PlaceSummary[]>`
    select p.id::int, p.name, p.category_id, c.label as category_label, c.broad, p.state::text, p.locality, p.classified_by,
           (select count(*) from matches m where m.place_a = p.id)::int as matches
    from places p join categories c on c.id = p.category_id
    where st_intersects(p.geog, (select cluster_box(k) from clusters k where k.id = ${clusterId})) and not p.stale
      ${term ? sql()`and (p.name ilike ${"%" + term + "%"} or p.name % ${term})` : sql()``}
      ${category ? sql()`and p.category_id = ${category}` : sql()``}
    order by ${term ? sql()`similarity(p.name, ${term}) desc,` : sql()``} p.name
    limit 40`;
}

export async function clusterCategories(clusterId: number) {
  return sql()<{ id: string; label: string; n: number }[]>`
    select c.id, c.label, count(*)::int as n from places p join categories c on c.id = p.category_id
    where st_intersects(p.geog, (select cluster_box(k) from clusters k where k.id = ${clusterId})) and not p.stale
    group by c.id, c.label order by c.label`;
}

export type PlaceDetail = {
  id: number;
  gers_id: string | null;
  source: string;
  name: string;
  category_id: string;
  category_label: string;
  broad: boolean;
  journey_id: string;
  state: string;
  serves_journey: boolean | null;
  website: string;
  phone: string;
  has_email: boolean;
  street: string;
  locality: string;
  region: string;
  postcode: string;
  confidence: number | null;
  classified_by: string;
  taxonomy_primary: string | null;
  source_datasets: string[];
  release: string | null;
};

export async function getPlace(id: number): Promise<PlaceDetail | null> {
  const [row] = await sql()<PlaceDetail[]>`
    select p.id::int, p.gers_id, p.source, p.name, p.category_id, c.label as category_label, c.broad, c.journey_id,
           p.state::text, p.serves_journey, p.website, p.phone, (p.email <> '') as has_email, p.street, p.locality,
           p.region, p.postcode, p.confidence, p.classified_by, p.taxonomy_primary, p.source_datasets, p.release
    from places p join categories c on c.id = p.category_id where p.id = ${id}`;
  return row ?? null;
}

export type MatchRow = {
  place_b: number;
  name: string;
  category_id: string;
  category_label: string;
  broad: boolean;
  state: string;
  locality: string;
  score: number;
  c: number;
  d: number;
  s: number;
  distance_m: number;
  partnership_type: string;
  reason_key: string;
  ai_rationale: string | null;
  rationale_edited: boolean;
  status: string;
};

export async function placeMatches(placeId: number): Promise<MatchRow[]> {
  return sql()<MatchRow[]>`
    select m.place_b::int, b.name, b.category_id, c.label as category_label, c.broad, b.state::text, b.locality,
           m.score, m.c, m.d, m.s, m.distance_m, m.partnership_type, m.reason_key, m.ai_rationale,
           m.rationale_edited, m.status
    from matches m join places b on b.id = m.place_b join categories c on c.id = b.category_id
    where m.place_a = ${placeId}
    order by (m.status = 'hidden'), m.score desc`;
}

export async function updateMatch(
  placeA: number,
  placeB: number,
  patch: { status?: string; rationale?: string | null },
) {
  const db = sql();
  if (patch.status) {
    await db`update matches set status = ${patch.status} where place_a = ${placeA} and place_b = ${placeB}`;
  }
  if (patch.rationale !== undefined) {
    await db`update matches set ai_rationale = ${patch.rationale}, rationale_edited = ${patch.rationale !== null}
             where place_a = ${placeA} and place_b = ${placeB}`;
  }
}

export async function setServesJourney(placeId: number, value: boolean | null) {
  await sql()`update places set serves_journey = ${value} where id = ${placeId}`;
}
