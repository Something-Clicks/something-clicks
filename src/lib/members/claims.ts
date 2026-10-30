import { after } from "next/server";
import { categoryById } from "@/content/journeys";
import type { PlaceState } from "@/content/network";
import { sql } from "@/lib/db";
import type { Place as Location } from "@/lib/network/search";
import { emailDomain, emailMatchesWebsite, websiteDomain } from "./domains";
import type { MemberSession } from "./session";

export type ClaimablePlace = {
  id: number;
  name: string;
  category_id: string | null;
  category_label: string;
  street: string;
  locality: string;
  region: string;
  postcode: string;
  phone: string;
  website: string;
  state: PlaceState;
  owned: boolean;
};

const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Name search for the claim flow: imported businesses only, nearest first when a location is given. */
export async function searchClaimable(q: string, near: Location | null, limit = 10): Promise<ClaimablePlace[]> {
  const name = q.trim().replace(/\s+/g, " ").slice(0, 80);
  if (name.length < 2) return [];
  const db = sql();
  return db<ClaimablePlace[]>`
    select p.id::int, p.name, p.category_id, coalesce(c.label, '') as category_label, p.street, p.locality, p.region,
           p.postcode, p.phone, p.website, p.state,
           exists (select 1 from place_claims pc where pc.place_id = p.id and pc.status = 'approved') as owned
    from places p left join categories c on c.id = p.category_id
    where not p.suppressed and not p.stale and cardinality(p.cluster_ids) > 0
      and (p.name ilike ${"%" + likeEscape(name) + "%"} or ${name} <% p.name)
      ${near ? db`and st_dwithin(p.geog, st_setsrid(st_makepoint(${near.lng}, ${near.lat}), 4326)::geography, 80000)` : db``}
    -- Names containing what they typed come first; then the closest match, nearest first.
    order by p.name ilike ${"%" + likeEscape(name) + "%"} desc, round(word_similarity(${name}, p.name)::numeric, 1) desc
      ${near ? db`, st_distance(p.geog, st_setsrid(st_makepoint(${near.lng}, ${near.lat}), 4326)::geography)` : db``}
    limit ${limit}`;
}

export async function getClaimable(id: number): Promise<ClaimablePlace | null> {
  const [row] = await sql()<ClaimablePlace[]>`
    select p.id::int, p.name, p.category_id, coalesce(c.label, '') as category_label, p.street, p.locality, p.region,
           p.postcode, p.phone, p.website, p.state,
           exists (select 1 from place_claims pc where pc.place_id = p.id and pc.status = 'approved') as owned
    from places p left join categories c on c.id = p.category_id
    where p.id = ${id} and not p.suppressed`;
  return row ?? null;
}

export type NewBusiness = {
  name: string;
  category_id: string;
  website: string;
  service_area: string;
  locality: string;
  region: string;
  lat: number;
  lng: number;
};

export type ClaimStart =
  | { status: "sent"; method: "email_domain" | "manual" }
  | { status: "owned" }
  | { status: "invalid"; error: string };

/**
 * Records a pending claim. An address at the business's website domain is
 * verified automatically once its link is opened; anything else goes to manual review.
 */
export async function startClaim(o: { placeId?: number; newBusiness?: NewBusiness; email: string; note: string }): Promise<ClaimStart> {
  const email = o.email.trim().toLowerCase();
  if (!emailDomain(email)) return { status: "invalid", error: "Enter a valid email address." };
  let website = o.newBusiness?.website ?? "";
  if (o.placeId) {
    const place = await getClaimable(o.placeId);
    if (!place) return { status: "invalid", error: "We couldn't find that business." };
    if (place.owned) return { status: "owned" };
    website = place.website;
  }
  const method = emailMatchesWebsite(email, website) ? "email_domain" : "manual";
  const evidence = { email_domain: emailDomain(email), website_domain: websiteDomain(website), note: o.note.trim().slice(0, 500) };
  await sql()`
    insert into place_claims (place_id, new_business, email, method, evidence)
    values (${o.placeId ?? null}, ${o.newBusiness ? sql().json(o.newBusiness) : null}, ${email}, ${method}, ${sql().json(evidence)})`;
  return { status: "sent", method };
}

/** Runs on every sign-in: the opened link proves the address, so pending claims made with it move forward. */
export async function onSignIn(member: MemberSession) {
  const claims = await sql()<{ id: number; method: string; place_id: number | null }[]>`
    update place_claims set member_id = ${member.id}, email_confirmed_at = coalesce(email_confirmed_at, now())
    where email = ${member.email} and status = 'pending'
    returning id::int, method, place_id::int`;
  for (const c of claims) {
    if (c.method === "email_domain") {
      await approveClaim(c.id).catch((e) => console.error("[claims] auto-approve failed", c.id, e));
    } else if (c.place_id) {
      // Claimed while Matt reviews it; never shown as verified until approved.
      await sql()`update places set state = 'claimed' where id = ${c.place_id} and state = 'listed'`;
    }
  }
}

/** Approves a claim: creates the business if it was added by hand, makes the claimant its owner, marks it verified. */
export async function approveClaim(claimId: number): Promise<{ ok: true; placeId: number } | { ok: false; error: string }> {
  const result = await sql().begin(async (tx) => {
    const [c] = await tx<{ id: number; place_id: number | null; new_business: NewBusiness | null; email: string; member_id: number | null; status: string; email_confirmed_at: Date | null }[]>`
      select id::int, place_id::int, new_business, email, member_id::int, status, email_confirmed_at
      from place_claims where id = ${claimId} for update`;
    if (!c || c.status !== "pending") return { ok: false as const, error: "This claim isn't pending." };
    if (!c.member_id || !c.email_confirmed_at) return { ok: false as const, error: "The claimant hasn't opened their email link yet." };

    let placeId = c.place_id;
    if (!placeId) {
      const b = c.new_business!;
      const category = categoryById(b.category_id);
      const [p] = await tx<{ id: number }[]>`
        insert into places (source, name, category_id, classified_by, website, locality, region, geog, state, serves_journey)
        values ('member', ${b.name}, ${b.category_id}, 'owner', ${b.website}, ${b.locality}, ${b.region},
                st_setsrid(st_makepoint(${b.lng}, ${b.lat}), 4326)::geography, 'verified', ${category ? true : null})
        returning id::int`;
      placeId = p.id;
      await tx`update place_claims set place_id = ${placeId} where id = ${claimId}`;
    } else {
      const [owned] = await tx`select 1 from place_claims where place_id = ${placeId} and status = 'approved'`;
      if (owned) return { ok: false as const, error: "This business already has an owner." };
    }
    await tx`update place_claims set status = 'approved', reviewed_at = now() where id = ${claimId}`;
    // Anyone else's pending claim on the same business is superseded.
    await tx`update place_claims set status = 'rejected', reviewed_at = now(), review_note = 'Another claim was approved.'
             where place_id = ${placeId} and status = 'pending'`;
    await tx`update places set state = 'verified' where id = ${placeId} and state in ('listed', 'claimed')`;
    await tx`
      insert into profiles (place_id, member_id, contact_email, service_area)
      values (${placeId}, ${c.member_id}, ${c.email}, ${c.new_business?.service_area ?? ""})
      on conflict (place_id) do update set member_id = excluded.member_id`;
    return { ok: true as const, placeId, created: !c.place_id };
  });
  if (!result.ok) return result;
  // A business added by hand has no matches yet: generate its metro's after the response is sent.
  if (result.created) after(() => refreshMatchesFor(result.placeId).catch((e) => console.error("[claims] match refresh failed", e)));
  return { ok: true, placeId: result.placeId };
}

async function refreshMatchesFor(placeId: number) {
  const clusters = await sql()<{ id: number }[]>`
    select cl.id::int from clusters cl, places p
    where p.id = ${placeId} and cl.scope = 'metro' and cl.status = 'active' and st_intersects(p.geog, cluster_box(cl))`;
  for (const { id } of clusters) await sql()`select compute_matches(${id})`;
}

export async function rejectClaim(claimId: number, note: string) {
  await sql().begin(async (tx) => {
    const [c] = await tx<{ place_id: number | null }[]>`
      update place_claims set status = 'rejected', reviewed_at = now(), review_note = ${note.slice(0, 500)}
      where id = ${claimId} and status = 'pending' returning place_id::int`;
    if (!c?.place_id) return;
    const [stillClaimed] = await tx`
      select 1 from place_claims where place_id = ${c.place_id} and status = 'pending' and email_confirmed_at is not null`;
    if (!stillClaimed) await tx`update places set state = 'listed' where id = ${c.place_id} and state = 'claimed'`;
  });
}

export type ClaimQueueRow = {
  id: number;
  place_id: number | null;
  name: string;
  category_label: string;
  locality: string;
  region: string;
  website: string;
  phone: string;
  email: string;
  method: string;
  evidence: { email_domain?: string; website_domain?: string | null; note?: string };
  email_confirmed_at: Date | null;
  created_at: Date;
  is_new: boolean;
};

export async function claimQueue(): Promise<ClaimQueueRow[]> {
  return sql()<ClaimQueueRow[]>`
    select pc.id::int, pc.place_id::int,
           coalesce(p.name, pc.new_business->>'name') as name,
           coalesce(c.label, '') as category_label,
           coalesce(p.locality, pc.new_business->>'locality', '') as locality,
           coalesce(p.region, pc.new_business->>'region', '') as region,
           coalesce(p.website, pc.new_business->>'website', '') as website,
           coalesce(p.phone, '') as phone,
           pc.email, pc.method, pc.evidence, pc.email_confirmed_at, pc.created_at, pc.place_id is null as is_new
    from place_claims pc
    left join places p on p.id = pc.place_id
    left join categories c on c.id = coalesce(p.category_id, pc.new_business->>'category_id')
    where pc.status = 'pending' and pc.method = 'manual'
    order by pc.email_confirmed_at is null, pc.created_at`;
}
