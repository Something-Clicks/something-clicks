import { categoryById, partnershipLabels, reasonText, type Category, type PartnershipType } from "@/content/journeys";
import { sql } from "@/lib/db";

/** Anonymous search radius: counts are businesses within this distance. */
export const SEARCH_RADIUS_MILES = 25;
const RADIUS_M = SEARCH_RADIUS_MILES * 1609.344;

const STATES = new Set(
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR".split(" "),
);

export type Place = { id: number; label: string; lat: number; lng: number };

export type LocationResult =
  | { status: "found"; place: Place }
  | { status: "choose"; options: Place[] }
  | { status: "not_found" };

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s\-'.])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase());

type GeoRow = { id: number; kind: string; name: string; state: string; zcta: string | null; lat: number; lng: number; sim: number };

const toPlace = (r: GeoRow): Place => ({
  id: r.id,
  label: r.kind === "zcta" ? `ZIP ${r.name}` : `${titleCase(r.name)}, ${r.state}`,
  lat: r.lat,
  lng: r.lng,
});

/** "Plano, TX", "plano tx", "75024", or "Plano" (asks which state if ambiguous). */
export async function resolveLocation(input: string): Promise<LocationResult> {
  const q = input.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!q) return { status: "not_found" };
  const db = sql();

  const zip = q.match(/^(\d{5})(?:-\d{4})?$/);
  if (zip) {
    const rows = await db<GeoRow[]>`
      select id::int, kind, name, state, zcta, st_y(geog::geometry) as lat, st_x(geog::geometry) as lng, 1 as sim
      from geo_lookup where kind = 'zcta' and zcta = ${zip[1]} limit 1`;
    return rows[0] ? { status: "found", place: toPlace(rows[0]) } : { status: "not_found" };
  }

  const m = q.match(/^(.+?)[,\s]+([A-Za-z]{2})$/);
  const state = m && STATES.has(m[2].toUpperCase()) ? m[2].toUpperCase() : null;
  const city = (state ? m![1] : q).replace(/,$/, "").trim();
  const rows = await db<GeoRow[]>`
    select id::int, kind, name, state, zcta, st_y(geog::geometry) as lat, st_x(geog::geometry) as lng,
           similarity(lower(name), lower(${city})) as sim
    from geo_lookup
    where kind = 'place' and ${state ? db`state = ${state}` : db`true`}
      and lower(name) % lower(${city})
    order by sim desc, length(name)
    limit 8`;
  const good = rows.filter((r) => r.sim >= 0.45);
  if (!good.length) return { status: "not_found" };
  const exact = good.filter((r) => r.name.toLowerCase() === city.toLowerCase());
  if (exact.length === 1) return { status: "found", place: toPlace(exact[0]) };
  if (exact.length > 1) return { status: "choose", options: exact.map(toPlace) };
  if (good.length === 1 || good[0].sim - (good[1]?.sim ?? 0) > 0.15) return { status: "found", place: toPlace(good[0]) };
  return { status: "choose", options: good.slice(0, 5).map(toPlace) };
}

export type CategoryResult = {
  category: Category;
  count: number;
  nearestMiles: number;
  reason: string;
  partnershipType: PartnershipType;
  ideas: { type: PartnershipType; label: string; primary: boolean }[];
};

/**
 * Anonymous results: for each complementary category, how many businesses are
 * within the radius and how close the nearest ZIP with one is. No names.
 */
export async function searchMatches(categoryId: string, place: Place, limit = 6): Promise<CategoryResult[]> {
  const rows = await sql()<
    { category_b: string; label: string; plural: string; journey_id: string; n: number; nearest_m: number; reason_key: string; partnership_type: PartnershipType }[]
  >`
    with here as (select st_setsrid(st_makepoint(${place.lng}, ${place.lat}), 4326)::geography as g),
    near as (
      select pc.category_id, sum(pc.n)::int as n, min(st_distance(z.geog, here.g, false)) as nearest_m
      from here, geo_lookup z join place_counts pc on pc.zcta = z.zcta
      where z.kind = 'zcta' and st_dwithin(z.geog, here.g, ${RADIUS_M}, false)
      group by pc.category_id
    )
    select cm.category_b, c.label, c.plural, c.journey_id, near.n, near.nearest_m, cm.reason_key, cm.partnership_type
    from complements cm
    join categories c on c.id = cm.category_b
    join near on near.category_id = cm.category_b
    -- Broad categories (salons, bakeries…) aren't presented as partners until
    -- individual businesses are confirmed to serve the journey.
    where cm.category_a = ${categoryId} and not c.broad
    order by cm.strength desc, near.n desc
    limit ${limit}`;
  const order: PartnershipType[] = ["referral", "joint_offer", "distribution"];
  return rows.flatMap((r) => {
    // Categories created in admin aren't in journeys.json: describe them from the database row.
    const category: Category = categoryById(r.category_b) ?? {
      id: r.category_b, journeyId: r.journey_id, stage: "", label: r.label, plural: r.plural, broad: false, taxonomy: [], synonyms: [],
    };
    return [
      {
        category,
        count: r.n,
        nearestMiles: r.nearest_m / 1609.344,
        reason: reasonText(category.journeyId, r.reason_key),
        partnershipType: r.partnership_type,
        ideas: order.map((t) => ({ type: t, label: partnershipLabels[t], primary: t === r.partnership_type })),
      },
    ];
  });
}

/** Live count of a journey's imported businesses (wedding-specific; broad categories excluded). */
export async function mappedCount(journeyId: string): Promise<number> {
  const [row] = await sql()<{ n: number }[]>`
    select count(*)::int as n from places p join categories c on c.id = p.category_id
    where c.journey_id = ${journeyId} and not c.broad and not p.stale and not p.suppressed`;
  return row?.n ?? 0;
}
