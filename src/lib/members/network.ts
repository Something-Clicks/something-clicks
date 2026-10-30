import type { PartnershipType } from "@/content/journeys";
import type { PlaceState } from "@/content/network";
import { sql } from "@/lib/db";
import type { MemberSession } from "./session";

/**
 * Everything a member can see or do, always scoped to businesses they own
 * (an approved claim, recorded as a profile). Contact details of another
 * business are returned only for connected introductions.
 */

export const INTRO_LIMIT_PER_DAY = 20;

export type OwnedPlace = {
  id: number;
  name: string;
  category_id: string | null;
  category_label: string;
  journey_id: string;
  street: string;
  locality: string;
  region: string;
  postcode: string;
  phone: string;
  website: string;
  state: PlaceState;
  description: string;
  service_area: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  network_opt_in: boolean;
  in_metro: boolean;
};

export async function ownedPlaces(memberId: number): Promise<OwnedPlace[]> {
  return sql()<OwnedPlace[]>`
    select p.id::int, p.name, p.category_id, coalesce(c.label, '') as category_label, coalesce(c.journey_id, '') as journey_id,
           p.street, p.locality, p.region, p.postcode, p.phone, p.website, p.state,
           pr.description, pr.service_area, pr.contact_name, pr.contact_email, pr.contact_phone, pr.network_opt_in,
           exists (select 1 from clusters cl where cl.scope = 'metro' and cl.status = 'active'
                   and st_intersects(p.geog, cluster_box(cl))) as in_metro
    from profiles pr join places p on p.id = pr.place_id left join categories c on c.id = p.category_id
    where pr.member_id = ${memberId}
    order by pr.created_at`;
}

export type PendingClaim = { id: number; name: string; method: string; email_confirmed: boolean };

export async function pendingClaims(member: MemberSession): Promise<PendingClaim[]> {
  return sql()<PendingClaim[]>`
    select pc.id::int, coalesce(p.name, pc.new_business->>'name') as name, pc.method, pc.email_confirmed_at is not null as email_confirmed
    from place_claims pc left join places p on p.id = pc.place_id
    where (pc.member_id = ${member.id} or pc.email = ${member.email}) and pc.status = 'pending'
    order by pc.created_at`;
}

export type IntroStatus = "requested" | "connected" | "declined" | "withdrawn";

export type MyMatch = {
  place_b: number;
  name: string;
  category_id: string;
  category_label: string;
  state: PlaceState;
  locality: string;
  distance_m: number;
  reason_key: string;
  ai_rationale: string | null;
  partnership_type: PartnershipType;
  intro_id: number | null;
  intro_status: IntroStatus | null;
  intro_from_me: boolean;
};

export async function myMatches(placeId: number, limit = 30): Promise<MyMatch[]> {
  return sql()<MyMatch[]>`
    select m.place_b::int, b.name, b.category_id, c.label as category_label, b.state, b.locality, m.distance_m,
           m.reason_key, m.ai_rationale, m.partnership_type,
           i.id::int as intro_id, i.status as intro_status, coalesce(i.from_place = ${placeId}, false) as intro_from_me
    from matches m
    join places b on b.id = m.place_b
    join categories c on c.id = b.category_id
    left join introductions i on least(i.from_place, i.to_place) = least(m.place_a, m.place_b)
                             and greatest(i.from_place, i.to_place) = greatest(m.place_a, m.place_b)
    where m.place_a = ${placeId} and m.status <> 'hidden' and not b.suppressed and not b.stale
    order by m.score desc
    limit ${limit}`;
}

async function owns(memberId: number, placeId: number) {
  const [row] = await sql()<{ state: PlaceState; opted: boolean }[]>`
    select p.state, pr.network_opt_in as opted from profiles pr join places p on p.id = pr.place_id
    where pr.place_id = ${placeId} and pr.member_id = ${memberId}`;
  return row ?? null;
}

/** Keeps the match pair's status in step with the introduction, in both directions. Never moves it backwards. */
async function advanceMatch(a: number, b: number, status: "introduced" | "connected" | "live") {
  const order = ["suggested", "approved", "introduced", "connected", "live"];
  const earlier = order.slice(0, order.indexOf(status));
  await sql()`
    update matches set status = ${status}
    where ((place_a = ${a} and place_b = ${b}) or (place_a = ${b} and place_b = ${a})) and status in ${sql()(earlier)}`;
}

export type IntroResult =
  | { status: "requested"; toEmail: string; toName: string; fromName: string }
  | { status: "connected"; introId: number }
  | { status: "exists" }
  | { status: "error"; error: string };

export async function requestIntroduction(member: MemberSession, fromPlace: number, toPlace: number, note: string): Promise<IntroResult> {
  const me = await owns(member.id, fromPlace);
  if (!me) return { status: "error", error: "That isn't your business." };
  if (me.state !== "member") return { status: "error", error: "Join the network first, from your profile." };

  const [target] = await sql()<{ name: string; state: PlaceState; contact_email: string | null; matched: boolean }[]>`
    select b.name, b.state, pr.contact_email,
           exists (select 1 from matches m where (m.place_a = ${fromPlace} and m.place_b = b.id)
                                              or (m.place_a = b.id and m.place_b = ${fromPlace})) as matched
    from places b left join profiles pr on pr.place_id = b.id
    where b.id = ${toPlace} and not b.suppressed`;
  if (!target?.matched) return { status: "error", error: "You can request introductions with your matches." };
  if (target.state !== "member" || !target.contact_email) return { status: "error", error: "This business isn't on Something Clicks yet." };

  const [existing] = await sql()<{ id: number; from_place: number; status: IntroStatus }[]>`
    select id::int, from_place::int, status from introductions
    where least(from_place, to_place) = least(${fromPlace}::bigint, ${toPlace}::bigint)
      and greatest(from_place, to_place) = greatest(${fromPlace}::bigint, ${toPlace}::bigint)`;
  if (existing) {
    // They already asked us: asking back is the same as accepting.
    if (existing.status === "requested" && existing.from_place === toPlace) {
      await respondIntroduction(member, existing.id, true);
      return { status: "connected", introId: existing.id };
    }
    return { status: "exists" };
  }

  const [{ n }] = await sql()<{ n: number }[]>`
    select count(*)::int as n from introductions where requested_by = ${member.id} and created_at > now() - interval '1 day'`;
  if (n >= INTRO_LIMIT_PER_DAY) return { status: "error", error: `You can request ${INTRO_LIMIT_PER_DAY} introductions a day. Try again tomorrow.` };

  const [from] = await sql()<{ name: string }[]>`select name from places where id = ${fromPlace}`;
  await sql()`
    insert into introductions (from_place, to_place, requested_by, note)
    values (${fromPlace}, ${toPlace}, ${member.id}, ${note.trim().slice(0, 200)})
    on conflict do nothing`;
  await advanceMatch(fromPlace, toPlace, "introduced");
  return { status: "requested", toEmail: target.contact_email, toName: target.name, fromName: from.name };
}

export type RespondResult = { ok: true; requesterEmail: string; requesterName: string; responderName: string; accepted: boolean } | { ok: false };

export async function respondIntroduction(member: MemberSession, introId: number, accept: boolean): Promise<RespondResult> {
  const [row] = await sql()<{ from_place: number; to_place: number; requester_email: string; requester_name: string; responder_name: string }[]>`
    update introductions i set status = ${accept ? "connected" : "declined"}, responded_at = now()
    from profiles pr, places a, places b, profiles apr
    where i.id = ${introId} and i.status = 'requested'
      and pr.place_id = i.to_place and pr.member_id = ${member.id}
      and a.id = i.from_place and b.id = i.to_place and apr.place_id = i.from_place
    returning i.from_place::int, i.to_place::int, apr.contact_email as requester_email, a.name as requester_name, b.name as responder_name`;
  if (!row) return { ok: false };
  if (accept) await advanceMatch(row.from_place, row.to_place, "connected");
  return { ok: true, requesterEmail: row.requester_email, requesterName: row.requester_name, responderName: row.responder_name, accepted: accept };
}

export type IntroRow = {
  id: number;
  incoming: boolean;
  other_place: number;
  other_name: string;
  other_category: string;
  other_locality: string;
  note: string;
  status: IntroStatus;
  created_at: Date;
  // Only filled in once both sides have accepted.
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
};

export async function introductionsFor(placeId: number): Promise<IntroRow[]> {
  return sql()<IntroRow[]>`
    select i.id::int, i.to_place = ${placeId} as incoming, o.id::int as other_place, o.name as other_name,
           coalesce(c.label, '') as other_category, o.locality as other_locality, i.note, i.status, i.created_at,
           case when i.status = 'connected' then nullif(pr.contact_name, '') end as contact_name,
           case when i.status = 'connected' then nullif(pr.contact_email, '') end as contact_email,
           case when i.status = 'connected' then coalesce(nullif(pr.contact_phone, ''), nullif(o.phone, '')) end as contact_phone,
           case when i.status = 'connected' then nullif(o.website, '') end as website
    from introductions i
    join places o on o.id = case when i.from_place = ${placeId} then i.to_place else i.from_place end
    left join profiles pr on pr.place_id = o.id
    left join categories c on c.id = o.category_id
    where (i.from_place = ${placeId} or i.to_place = ${placeId}) and i.status <> 'withdrawn'
    order by i.status = 'requested' desc, i.created_at desc`;
}

export async function incomingCount(placeId: number): Promise<number> {
  const [{ n }] = await sql()<{ n: number }[]>`
    select count(*)::int as n from introductions where to_place = ${placeId} and status = 'requested'`;
  return n;
}

// ---------------------------------------------------------------------------
// Partnerships
// ---------------------------------------------------------------------------

export type PartnershipRow = {
  intro_id: number;
  other_name: string;
  other_place: number;
  partnership_id: number | null;
  type: PartnershipType | null;
  offer: string | null;
  code: string | null;
  link: string | null;
  stage: "proposed" | "live" | "ended" | null;
  proposed_by_me: boolean;
  my_code: string | null;
  my_clicks: number;
  their_clicks: number;
};

/** Connected introductions, each with its latest partnership (if any). */
export async function partnershipsFor(placeId: number): Promise<PartnershipRow[]> {
  return sql()<PartnershipRow[]>`
    select i.id::int as intro_id, o.name as other_name, o.id::int as other_place,
           pa.id::int as partnership_id, pa.type, pa.offer, pa.code, pa.link, pa.stage,
           coalesce(pa.proposed_by = ${placeId}, false) as proposed_by_me,
           mine.code as my_code, coalesce(mine.clicks, 0) as my_clicks, coalesce(theirs.clicks, 0) as their_clicks
    from introductions i
    join places o on o.id = case when i.from_place = ${placeId} then i.to_place else i.from_place end
    left join lateral (select * from partnerships p where p.introduction_id = i.id and p.stage <> 'ended'
                       order by p.created_at desc limit 1) pa on true
    left join partnership_links mine on mine.partnership_id = pa.id and mine.place_id = ${placeId}
    left join partnership_links theirs on theirs.partnership_id = pa.id and theirs.place_id = o.id
    where (i.from_place = ${placeId} or i.to_place = ${placeId}) and i.status = 'connected'
    order by pa.stage = 'proposed' and not coalesce(pa.proposed_by = ${placeId}, false) desc, i.responded_at desc`;
}

/** The introduction must be connected and the member must own one side of it. Returns the other side. */
async function connectedSide(member: MemberSession, introId: number, placeId: number) {
  const [row] = await sql()<{ other: number }[]>`
    select case when i.from_place = ${placeId} then i.to_place else i.from_place end::int as other
    from introductions i join profiles pr on pr.place_id = ${placeId} and pr.member_id = ${member.id}
    where i.id = ${introId} and i.status = 'connected' and ${placeId} in (i.from_place, i.to_place)`;
  return row?.other ?? null;
}

export const validLink = (s: string) => {
  if (!s) return true;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

export async function proposePartnership(
  member: MemberSession,
  placeId: number,
  introId: number,
  p: { type: PartnershipType; offer: string; code: string; link: string },
): Promise<boolean> {
  if (!(await connectedSide(member, introId, placeId))) return false;
  await sql().begin(async (tx) => {
    // A new proposal replaces any earlier one that wasn't agreed yet.
    await tx`update partnerships set stage = 'ended' where introduction_id = ${introId} and stage = 'proposed'`;
    await tx`
      insert into partnerships (introduction_id, proposed_by, type, offer, code, link)
      values (${introId}, ${placeId}, ${p.type}, ${p.offer}, ${p.code}, ${p.link})`;
  });
  return true;
}

const trackingCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");

/** The other business agrees: the partnership goes live and each side gets its own tracking link. */
export async function acceptPartnership(member: MemberSession, placeId: number, partnershipId: number): Promise<boolean> {
  return sql().begin(async (tx) => {
    const [p] = await tx<{ introduction_id: number; proposed_by: number }[]>`
      select introduction_id::int, proposed_by::int from partnerships where id = ${partnershipId} and stage = 'proposed' for update`;
    if (!p || p.proposed_by === placeId) return false;
    const other = await connectedSide(member, p.introduction_id, placeId);
    if (other !== p.proposed_by) return false;
    await tx`update partnerships set stage = 'live' where id = ${partnershipId}`;
    for (const place of [placeId, other]) {
      await tx`insert into partnership_links (code, partnership_id, place_id) values (${trackingCode()}, ${partnershipId}, ${place})
               on conflict (partnership_id, place_id) do nothing`;
    }
    await tx`
      update matches set status = 'live'
      where ((place_a = ${placeId} and place_b = ${other}) or (place_a = ${other} and place_b = ${placeId})) and status <> 'live'`;
    return true;
  });
}

export async function endPartnership(member: MemberSession, placeId: number, partnershipId: number): Promise<void> {
  await sql()`
    update partnerships pa set stage = 'ended'
    from introductions i
    where pa.id = ${partnershipId} and i.id = pa.introduction_id and ${placeId} in (i.from_place, i.to_place)
      and exists (select 1 from profiles pr where pr.place_id = ${placeId} and pr.member_id = ${member.id})`;
}

/**
 * A partner's tracking link: counts the visit and sends it to the other
 * business (its offer link if it made the offer, otherwise its website).
 */
export async function followTrackingLink(code: string): Promise<string | null> {
  if (!/^[a-z0-9]{6,16}$/.test(code)) return null;
  const [row] = await sql()<{ destination: string }[]>`
    with hit as (
      update partnership_links pl set clicks = clicks + 1
      from partnerships pa where pl.code = ${code} and pa.id = pl.partnership_id and pa.stage = 'live'
      returning pl.partnership_id, pl.place_id
    )
    select case when pa.proposed_by <> hit.place_id and pa.link <> '' then pa.link else o.website end as destination
    from hit join partnerships pa on pa.id = hit.partnership_id
    join introductions i on i.id = pa.introduction_id
    join places o on o.id = case when i.from_place = hit.place_id then i.to_place else i.from_place end`;
  return row?.destination && validLink(row.destination) ? row.destination : null;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function saveProfile(
  member: MemberSession,
  placeId: number,
  p: { description: string; service_area: string; contact_name: string; contact_email: string; contact_phone: string; network_opt_in: boolean },
): Promise<boolean> {
  const rows = await sql()`
    update profiles set description = ${p.description}, service_area = ${p.service_area}, contact_name = ${p.contact_name},
           contact_email = ${p.contact_email}, contact_phone = ${p.contact_phone}, network_opt_in = ${p.network_opt_in}
    where place_id = ${placeId} and member_id = ${member.id}
    returning place_id`;
  if (!rows.length) return false;
  await sql()`update places set state = ${p.network_opt_in ? "member" : "verified"} where id = ${placeId} and state in ('verified', 'member')`;
  return true;
}
