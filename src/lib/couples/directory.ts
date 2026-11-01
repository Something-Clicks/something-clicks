import { sql } from "@/lib/db";
import { activePartnerIds } from "@/lib/planner/partners";
import { LINK_SOURCES, type InquirySource } from "./config";
import type { Photo } from "./profile";

/**
 * What couples can see. Only businesses that are verified, not suppressed,
 * and whose owner turned on "Show my profile to couples" ever appear: an
 * unclaimed or hidden business is never named here, not even as a partner.
 *
 * Order is a neutral daily rotation. Nothing paid is read here (no plans,
 * add-ons or billing tables), and this never affects partner matching.
 */

const PUBLIC = `pr.public_visible and pr.public_slug is not null and p.state in ('verified', 'member') and not p.suppressed and not p.stale`;

export type VendorCard = {
  place_id: number;
  slug: string;
  name: string;
  category_id: string | null;
  category_label: string;
  locality: string;
  region: string;
  price_from: number | null;
  price_to: number | null;
  styles: string[];
  photo: string | null;
};

export async function browseVendors(f: { market: string; category?: string | null; budgetMax?: number | null; limit?: number }): Promise<VendorCard[]> {
  const db = sql();
  return db<VendorCard[]>`
    select p.id::int as place_id, pr.public_slug as slug, p.name, p.category_id, coalesce(c.label, '') as category_label,
           p.locality, p.region, pr.price_from, pr.price_to, pr.styles,
           (select url from portfolio_photos ph where ph.place_id = p.id order by position, id limit 1) as photo
    from profiles pr join places p on p.id = pr.place_id left join categories c on c.id = p.category_id
    where ${db.unsafe(PUBLIC)} and ${f.market} = any(pr.markets)
      and ${f.category ? db`p.category_id = ${f.category}` : db`true`}
      and ${f.budgetMax ? db`(pr.price_from is null or pr.price_from <= ${f.budgetMax})` : db`true`}
    order by md5(p.id::text || current_date::text)
    limit ${f.limit ?? 60}`;
}

/** How many public vendors each market has (to decide when a market is ready). */
export async function publicCounts(): Promise<Record<string, number>> {
  const rows = await sql()<{ market: string; n: number }[]>`
    select m as market, count(*)::int as n
    from profiles pr join places p on p.id = pr.place_id, unnest(pr.markets) m
    where ${sql().unsafe(PUBLIC)} group by m`;
  return Object.fromEntries(rows.map((r) => [r.market, r.n]));
}

export type PublicProfile = VendorCard & {
  about: string;
  description: string;
  website: string;
  service_area: string;
  markets: string[];
  photos: Photo[];
};

export async function publicProfile(slug: string): Promise<PublicProfile | null> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null;
  const db = sql();
  const [row] = await db<Omit<PublicProfile, "photos">[]>`
    select p.id::int as place_id, pr.public_slug as slug, p.name, p.category_id, coalesce(c.label, '') as category_label,
           p.locality, p.region, pr.price_from, pr.price_to, pr.styles, null as photo,
           pr.about, pr.description, p.website, pr.service_area, pr.markets
    from profiles pr join places p on p.id = pr.place_id left join categories c on c.id = p.category_id
    where pr.public_slug = ${slug} and ${db.unsafe(PUBLIC)}`;
  if (!row) return null;
  const photos = await db<Photo[]>`select id::int, url, alt from portfolio_photos where place_id = ${row.place_id} order by position, id`;
  return { ...row, photo: photos[0]?.url ?? null, photos };
}

/**
 * "Works well with": businesses this vendor has a live partnership with,
 * shown only when the partner is public too. Matching itself is untouched.
 */
export async function worksWellWith(placeId: number, limit = 6): Promise<VendorCard[]> {
  const db = sql();
  return db<VendorCard[]>`
    select distinct on (p.id) p.id::int as place_id, pr.public_slug as slug, p.name, p.category_id, coalesce(c.label, '') as category_label,
           p.locality, p.region, pr.price_from, pr.price_to, pr.styles,
           (select url from portfolio_photos ph where ph.place_id = p.id order by position, id limit 1) as photo
    from partnerships pa
    join introductions i on i.id = pa.introduction_id
    join places p on p.id = case when i.from_place = ${placeId} then i.to_place else i.from_place end
    join profiles pr on pr.place_id = p.id
    left join categories c on c.id = p.category_id
    where pa.stage = 'live' and ${placeId} in (i.from_place, i.to_place) and ${db.unsafe(PUBLIC)}
    order by p.id
    limit ${limit}`;
}

/**
 * Where a visit or inquiry came from. ?via= names the public vendor whose
 * "Works well with" the couple followed (a Planner Partner counts as
 * planner_partner); ?src= may name a joint promotion or referral link.
 */
export async function resolveSource(placeId: number, via: string | null | undefined, src: string | null | undefined): Promise<{ source: InquirySource; viaPlaceId: number | null }> {
  if (via && /^[a-z0-9-]{1,80}$/.test(via)) {
    const db = sql();
    const [v] = await db<{ id: number }[]>`
      select p.id::int as id from profiles pr join places p on p.id = pr.place_id
      where pr.public_slug = ${via} and ${db.unsafe(PUBLIC)} and p.id <> ${placeId}`;
    if (v) return { source: (await activePartnerIds([v.id])).has(v.id) ? "planner_partner" : "partner_profile", viaPlaceId: v.id };
  }
  if (src && (LINK_SOURCES as string[]).includes(src)) return { source: src as InquirySource, viaPlaceId: null };
  return { source: "direct_profile", viaPlaceId: null };
}

/** Counts a profile view for the day and source. No visitor details are stored. */
export async function recordView(placeId: number, source: InquirySource): Promise<void> {
  await sql()`
    insert into profile_views (place_id, day, source, views) values (${placeId}, current_date, ${source}, 1)
    on conflict (place_id, day, source) do update set views = profile_views.views + 1`;
}
