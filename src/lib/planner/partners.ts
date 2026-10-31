import { plannerPartnerAgreements, type AgreementVersion } from "@/content/agreements/planner-partner";
import { site } from "@/content/site";
import { sql } from "@/lib/db";
import { mailingAddress, plannerInvite, unsubscribeToken } from "@/lib/invitations";
import { sendEmail, simpleEmail } from "@/lib/mailer";
import type { OwnedPlace } from "@/lib/members/network";
import type { MemberSession } from "@/lib/members/session";

/**
 * Planner Partners. Complimentary membership is a row here (start and end
 * dates), never a Stripe charge. Being a Planner Partner never affects
 * matching, ranking or search order.
 */

// ---------------------------------------------------------------------------
// The agreement
// ---------------------------------------------------------------------------

const today = () => new Date().toISOString().slice(0, 10);

/** The version in force today (the newest whose effective date has arrived). */
export function currentAgreement(on = today()): AgreementVersion {
  const live = plannerPartnerAgreements.filter((a) => a.effective <= on);
  return live[live.length - 1] ?? plannerPartnerAgreements[0];
}

/** A newer version that has been published but isn't in force yet, if any. */
export function upcomingAgreement(on = today()): AgreementVersion | null {
  return plannerPartnerAgreements.find((a) => a.effective > on) ?? null;
}

export const agreementByVersion = (v: string) => plannerPartnerAgreements.find((a) => a.version === v) ?? null;

export const agreementUrl = (version: string) => `${site.url}/planner-partners/agreement/v${version}`;

/** Records a clickwrap acceptance and emails the planner a link to the exact version. */
export async function recordAcceptance(member: MemberSession, place: { id: number; name: string }, ip: string): Promise<number> {
  const a = currentAgreement();
  const [row] = await sql()<{ id: number; accepted_at: Date }[]>`
    insert into agreement_acceptances (agreement, version, member_id, email, place_id, ip)
    values ('planner_partner', ${a.version}, ${member.id}, ${member.email}, ${place.id}, ${ip.slice(0, 64)})
    returning id::int, accepted_at`;
  await sendEmail({
    to: member.email,
    subject: `Your copy of the Planner Partner Agreement (v${a.version})`,
    ...simpleEmail({
      heading: "Thanks for accepting the Planner Partner Agreement.",
      lines: [
        `You accepted version ${a.version} for ${place.name} on ${row.accepted_at.toUTCString()}.`,
        "This link always shows that exact version, so you can keep it for your records.",
      ],
      button: { label: `Read version ${a.version}`, url: agreementUrl(a.version) },
      footer: "You're getting this because you applied to be a Something Clicks Planner Partner.",
    }),
  }).catch((e) => console.error("[planner] agreement copy failed", e));
  return row.id;
}

/** The newest version this business has accepted, if any. */
export async function acceptedVersion(placeId: number): Promise<{ version: string; accepted_at: Date } | null> {
  const [row] = await sql()<{ version: string; accepted_at: Date }[]>`
    select version, accepted_at from agreement_acceptances
    where agreement = 'planner_partner' and place_id = ${placeId}
    order by accepted_at desc limit 1`;
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Partners and applications
// ---------------------------------------------------------------------------

export type Partner = { starts_on: string; ends_on: string; ended_at: Date | null; active: boolean };

const partnerCols = (db: ReturnType<typeof sql>) => db`
  to_char(starts_on, 'YYYY-MM-DD') as starts_on, to_char(ends_on, 'YYYY-MM-DD') as ends_on, ended_at,
  (ended_at is null and starts_on <= current_date and ends_on >= current_date) as active`;

export async function partnerFor(placeId: number): Promise<Partner | null> {
  try {
    const [row] = await sql()<Partner[]>`select ${partnerCols(sql())} from planner_partners where place_id = ${placeId}`;
    return row ?? null;
  } catch {
    return null; // the planner_partners migration isn't applied yet
  }
}

/** Which of these businesses are active Planner Partners. Display only: never used to order or filter. */
export async function activePartnerIds(placeIds: number[]): Promise<Set<number>> {
  if (!placeIds.length) return new Set();
  try {
    const rows = await sql()<{ place_id: number }[]>`
      select place_id::int from planner_partners
      where place_id = any(${placeIds}::bigint[]) and ended_at is null and starts_on <= current_date and ends_on >= current_date`;
    return new Set(rows.map((r) => r.place_id));
  } catch {
    return new Set();
  }
}

/** Who may apply: the verified owner of a claimed wedding-planner business that isn't already a partner. */
export const canApply = (place: Pick<OwnedPlace, "state" | "category_id">) =>
  (place.state === "verified" || place.state === "member") && place.category_id === "wedding_planners";

export type ApplyResult = { ok: true } | { ok: false; error: string };

export async function apply(member: MemberSession, place: OwnedPlace, message: string, agreed: boolean, ip: string): Promise<ApplyResult> {
  if (!canApply(place)) return { ok: false, error: "Planner Partners are verified wedding planners on Something Clicks." };
  if (!agreed) return { ok: false, error: "Please read and agree to the Planner Partner Agreement." };
  const partner = await partnerFor(place.id);
  if (partner?.active) return { ok: false, error: "You're already a Planner Partner." };
  const [pending] = await sql()`select 1 from planner_applications where place_id = ${place.id} and status = 'pending'`;
  if (pending) return { ok: false, error: "Your application is already in. We'll be in touch." };
  const acceptanceId = await recordAcceptance(member, place, ip);
  await sql()`
    insert into planner_applications (place_id, member_id, message, acceptance_id)
    values (${place.id}, ${member.id}, ${message.slice(0, 1000)}, ${acceptanceId})`;
  return { ok: true };
}

/** A partner made by an admin directly hasn't clicked through yet: they accept from their dashboard. */
export async function acceptFromDashboard(member: MemberSession, place: OwnedPlace, agreed: boolean, ip: string): Promise<ApplyResult> {
  if (!agreed) return { ok: false, error: "Please read and agree to the Planner Partner Agreement." };
  if (!(await partnerFor(place.id))) return { ok: false, error: "This business isn't a Planner Partner." };
  await recordAcceptance(member, place, ip);
  return { ok: true };
}

/** Admin: make a claimed, verified business a Planner Partner (default 12 months from the start). */
export async function markPartner(placeId: number, startsOn?: string, endsOn?: string): Promise<ApplyResult> {
  const [place] = await sql()<{ state: string }[]>`
    select p.state from places p where p.id = ${placeId}
      and exists (select 1 from place_claims pc where pc.place_id = p.id and pc.status = 'approved')`;
  if (!place || !["verified", "member"].includes(place.state)) return { ok: false, error: "Only claimed, verified businesses can be Planner Partners." };
  const start = startsOn || today();
  const end = endsOn || addMonths(start, 12);
  if (end <= start) return { ok: false, error: "The end date must be after the start date." };
  await sql()`
    insert into planner_partners (place_id, starts_on, ends_on) values (${placeId}, ${start}, ${end})
    on conflict (place_id) do update set starts_on = excluded.starts_on, ends_on = excluded.ends_on, ended_at = null, end_reminder_sent_at = null`;
  await sql()`update planner_applications set status = 'approved', decided_at = now() where place_id = ${placeId} and status = 'pending'`;
  return { ok: true };
}

export async function endPartner(placeId: number) {
  await sql()`update planner_partners set ended_at = now() where place_id = ${placeId}`;
}

export async function rejectApplication(id: number) {
  await sql()`update planner_applications set status = 'rejected', decided_at = now() where id = ${id} and status = 'pending'`;
}

export function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Vendor invites (nothing is emailed until an admin approves)
// ---------------------------------------------------------------------------

export const MAX_INVITES = 10;

export type InviteInput = { name: string; category_id: string; city: string; contact_email: string; note: string };

export async function invitesFrom(partnerPlaceId: number) {
  return sql()<{ id: number; name: string; city: string; contact_email: string; status: string; claimed: boolean; created_at: Date }[]>`
    select v.id::int, v.name, v.city, v.contact_email, v.status, ${claimedExpr(sql())} as claimed, v.created_at
    from vendor_invites v where v.partner_place_id = ${partnerPlaceId} order by v.created_at`;
}

/** An invited business counts as claimed once its owner has an approved claim with the invited address (or an admin linked it). */
const claimedExpr = (db: ReturnType<typeof sql>) => db`(v.claimed_place_id is not null or exists (
  select 1 from place_claims pc where pc.email = v.contact_email and pc.status = 'approved'))`;

export async function addInvites(partnerPlaceId: number, rows: InviteInput[]): Promise<{ added: number; error?: string }> {
  const partner = await partnerFor(partnerPlaceId);
  if (!partner?.active) return { added: 0, error: "Inviting vendors is for active Planner Partners." };
  const [{ n }] = await sql()<{ n: number }[]>`select count(*)::int as n from vendor_invites where partner_place_id = ${partnerPlaceId}`;
  const room = MAX_INVITES - n;
  if (room <= 0) return { added: 0, error: `You've invited ${MAX_INVITES} businesses, the most for now. Thank you!` };
  let added = 0;
  for (const r of rows.slice(0, room)) {
    const res = await sql()`
      insert into vendor_invites (partner_place_id, name, category_id, city, contact_email, note)
      values (${partnerPlaceId}, ${r.name}, ${r.category_id || null}, ${r.city}, ${r.contact_email}, ${r.note})
      on conflict (partner_place_id, contact_email) do nothing`;
    added += res.count;
  }
  return { added, ...(rows.length > room ? { error: `Only ${room} more fit; you can invite up to ${MAX_INVITES}.` } : {}) };
}

export type InviteRow = {
  id: number; name: string; category_label: string | null; city: string; contact_email: string; note: string; status: string;
  claimed: boolean; partner_place_id: number; partner_name: string; created_at: Date;
};

export async function inviteQueue(): Promise<InviteRow[]> {
  return sql()<InviteRow[]>`
    select v.id::int, v.name, c.label as category_label, v.city, v.contact_email, v.note, v.status, ${claimedExpr(sql())} as claimed,
           v.partner_place_id::int, p.name as partner_name, v.created_at
    from vendor_invites v join places p on p.id = v.partner_place_id left join categories c on c.id = v.category_id
    order by (v.status in ('new')) desc, v.created_at`;
}

/** Admin approval: sends the one invitation email (needs MAILING_ADDRESS and INVITE_EMAIL_FROM). */
export async function approveInvite(id: number): Promise<ApplyResult> {
  const address = mailingAddress();
  const from = process.env.INVITE_EMAIL_FROM;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!address || !from || !secret) return { ok: false, error: "Set MAILING_ADDRESS and INVITE_EMAIL_FROM in Vercel before sending invitations." };
  const [v] = await sql()<{ name: string; contact_email: string; note: string; status: string; partner_name: string; partner_city: string }[]>`
    select v.name, v.contact_email, v.note, v.status, p.name as partner_name, coalesce(nullif(p.locality, ''), p.region, '') as partner_city
    from vendor_invites v join places p on p.id = v.partner_place_id where v.id = ${id}`;
  if (!v || v.status !== "new") return { ok: false, error: "This invitation isn't waiting for approval." };
  const [unsub] = await sql()`select 1 from suppression where kind = 'email' and value = ${v.contact_email}`;
  if (unsub) return { ok: false, error: "That address has unsubscribed from our emails." };
  const mail = plannerInvite({
    business: v.name, to: v.contact_email, siteUrl: site.url, unsubscribeToken: await unsubscribeToken(v.contact_email, secret), address,
    plannerBusiness: v.partner_name, plannerCity: v.partner_city || "your area", note: v.note || undefined,
    claimPath: `/claim?${new URLSearchParams({ q: v.name })}`,
  });
  await sendEmail({ to: v.contact_email, from, subject: mail.subject, text: mail.text, html: mail.html, headers: mail.headers });
  await sql()`update vendor_invites set status = 'approved', approved_at = now() where id = ${id}`;
  return { ok: true };
}

export async function setInviteStatus(id: number, status: "declined" | "claimed", claimedPlaceId?: number) {
  await sql()`update vendor_invites set status = ${status}, claimed_place_id = coalesce(${claimedPlaceId ?? null}, claimed_place_id) where id = ${id}`;
}

// ---------------------------------------------------------------------------
// Admin list with stats
// ---------------------------------------------------------------------------

export type PartnerRow = {
  place_id: number; business: string; email: string | null; starts_on: string; ends_on: string; active: boolean; ended_at: Date | null;
  invited: number; claimed: number; intros_accepted: number; partnerships_live: number;
  agreement_version: string | null; accepted_at: Date | null; accepted_ip: string | null; accepted_by: string | null;
};

export async function listPartners(): Promise<PartnerRow[]> {
  const db = sql();
  return db<PartnerRow[]>`
    select pp.place_id::int, p.name as business, m.email, ${partnerCols(db)},
      (select count(*)::int from vendor_invites v where v.partner_place_id = pp.place_id) as invited,
      (select count(*)::int from vendor_invites v where v.partner_place_id = pp.place_id and ${claimedExpr(db)}) as claimed,
      (select count(*)::int from introductions i where pp.place_id in (i.from_place, i.to_place) and i.status = 'connected') as intros_accepted,
      (select count(*)::int from partnerships pa join introductions i on i.id = pa.introduction_id
        where pa.stage = 'live' and pp.place_id in (i.from_place, i.to_place)) as partnerships_live,
      a.version as agreement_version, a.accepted_at, a.ip as accepted_ip, a.email as accepted_by
    from planner_partners pp
    join places p on p.id = pp.place_id
    left join profiles pr on pr.place_id = pp.place_id
    left join members m on m.id = pr.member_id
    left join lateral (
      select version, accepted_at, ip, email from agreement_acceptances
      where agreement = 'planner_partner' and place_id = pp.place_id order by accepted_at desc limit 1
    ) a on true
    order by pp.ends_on`;
}

export async function listApplications() {
  return sql()<{ id: number; place_id: number; business: string; email: string; message: string; created_at: Date; version: string; ip: string }[]>`
    select ap.id::int, ap.place_id::int, p.name as business, a.email, ap.message, ap.created_at, a.version, a.ip
    from planner_applications ap join places p on p.id = ap.place_id join agreement_acceptances a on a.id = ap.acceptance_id
    where ap.status = 'pending' order by ap.created_at`;
}

/** Claimed, verified businesses an admin can make Planner Partners. */
export async function eligibleBusinesses() {
  return sql()<{ id: number; name: string; category_label: string }[]>`
    select p.id::int, p.name, coalesce(c.label, '') as category_label
    from places p left join categories c on c.id = p.category_id
    where p.state in ('verified', 'member')
      and exists (select 1 from place_claims pc where pc.place_id = p.id and pc.status = 'approved')
      and not exists (select 1 from planner_partners pp where pp.place_id = p.id and pp.ended_at is null and pp.ends_on >= current_date)
    order by (p.category_id = 'wedding_planners') desc, p.name
    limit 500`;
}

// ---------------------------------------------------------------------------
// Reminders (daily cron)
// ---------------------------------------------------------------------------

/**
 * 30 days before a partnership ends: one reminder to the admin. 30 days before
 * a new agreement version takes effect: one notice to each active partner.
 */
export async function sendReminders(on = today()): Promise<{ endReminders: number; agreementNotices: number }> {
  const out = { endReminders: 0, agreementNotices: 0 };
  const adminTo = process.env.NOTIFY_EMAIL_TO;
  const ending = await sql()<{ place_id: number; business: string; ends_on: string }[]>`
    select pp.place_id::int, p.name as business, to_char(pp.ends_on, 'YYYY-MM-DD') as ends_on
    from planner_partners pp join places p on p.id = pp.place_id
    where pp.ended_at is null and pp.end_reminder_sent_at is null
      and pp.ends_on >= ${on}::date and pp.ends_on <= ${on}::date + 30`;
  if (adminTo && ending.length) {
    await sendEmail({
      to: adminTo,
      subject: `${ending.length} Planner Partner${ending.length === 1 ? "" : "s"} ending within 30 days`,
      ...simpleEmail({
        heading: "Planner Partners ending soon",
        lines: [...ending.map((e) => `${e.business}: ends ${e.ends_on}`), "Their agreement says we'll tell them their options at least 30 days ahead."],
        button: { label: "Open Planner Partners", url: `${site.url}/admin/network/planner-partners` },
      }),
    });
    await sql()`update planner_partners set end_reminder_sent_at = now() where place_id = any(${ending.map((e) => e.place_id)}::bigint[])`;
    out.endReminders = ending.length;
  }

  const next = upcomingAgreement(on);
  if (next && daysBetween(on, next.effective) <= 30) {
    const partners = await sql()<{ place_id: number; business: string; email: string }[]>`
      select pp.place_id::int, p.name as business, coalesce(nullif(pr.contact_email, ''), m.email) as email
      from planner_partners pp join places p on p.id = pp.place_id
      join profiles pr on pr.place_id = pp.place_id join members m on m.id = pr.member_id
      where pp.ended_at is null and pp.ends_on >= ${on}::date
        and not exists (select 1 from agreement_notices n where n.place_id = pp.place_id and n.agreement = 'planner_partner' and n.version = ${next.version})`;
    for (const p of partners) {
      await sendEmail({
        to: p.email,
        subject: `The Planner Partner Agreement is changing on ${next.effective}`,
        ...simpleEmail({
          heading: `Version ${next.version} of the Planner Partner Agreement`,
          lines: [
            `We've updated the Planner Partner Agreement. Version ${next.version} takes effect on ${next.effective}.`,
            "Please read it. If you don't agree, you can end your Planner Partner agreement under Section 14 before then.",
          ],
          button: { label: `Read version ${next.version}`, url: agreementUrl(next.version) },
          footer: `You're getting this because ${p.business} is a Something Clicks Planner Partner.`,
        }),
      });
      await sql()`insert into agreement_notices (place_id, agreement, version) values (${p.place_id}, 'planner_partner', ${next.version}) on conflict do nothing`;
      out.agreementNotices++;
    }
  }
  return out;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
