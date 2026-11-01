import { site } from "@/content/site";
import { sql } from "@/lib/db";
import { sendEmail, simpleEmail } from "@/lib/mailer";
import { validEmail } from "@/lib/members/limits";
import type { MemberSession } from "@/lib/members/session";
import { getStore } from "@/lib/store";
import { HONEYPOT_FIELD, MIN_FILL_MS, STARTED_AT_FIELD } from "@/lib/submissions";
import { BUDGETS, couplesOpen, SOURCES, STATUSES, type InquirySource, type InquiryStatus } from "./config";
import { publicProfile, resolveSource } from "./directory";

/**
 * Couple inquiries. Only the vendor the couple contacted ever sees them: every
 * read is scoped to a business the signed-in member owns. Spam protection: a
 * hidden field, a minimum fill time, and rate limits per visitor and per email.
 */

export type InquiryInput = Record<string, string | undefined>;
export type InquiryResult =
  | { status: "ok"; vendorName: string; slug: string; spam?: boolean }
  | { status: "invalid"; errors: Record<string, string> }
  | { status: "limited" }
  | { status: "closed" };

const clean = (s: string | undefined, max: number) => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").trim().slice(0, max);

async function allowed(key: string, windowSeconds: number, max: number): Promise<boolean> {
  try {
    return await getStore().checkRateLimit(key, windowSeconds, max);
  } catch (error) {
    console.error("[inquiries] rate limit check failed", error);
    return true; // fail open, like the other forms
  }
}

export async function submitInquiry(
  input: InquiryInput,
  ctx: { visitorKey: string; now?: () => number; notify?: typeof sendEmail },
): Promise<InquiryResult> {
  if (!couplesOpen()) return { status: "closed" };
  const vendor = await publicProfile(clean(input.slug, 80));
  if (!vendor) return { status: "closed" };
  const ok = { status: "ok" as const, vendorName: vendor.name, slug: vendor.slug };

  // Bots: a filled hidden field or an instant submit looks like success but saves nothing.
  if (clean(input[HONEYPOT_FIELD], 200)) return { ...ok, spam: true };
  const started = Number(input[STARTED_AT_FIELD]);
  if (Number.isFinite(started) && started > 0 && (ctx.now ?? Date.now)() - started < MIN_FILL_MS) return { ...ok, spam: true };

  const name = clean(input.name, 120);
  const email = clean(input.email, 254).toLowerCase();
  const phone = clean(input.phone, 40);
  const location = clean(input.location, 200);
  const message = clean(input.message, 2000);
  const budget = clean(input.budget, 40);
  const date = clean(input.wedding_date, 10);
  const guestsRaw = clean(input.guest_count, 6);
  const guests = guestsRaw ? Number(guestsRaw) : null;

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Enter your name.";
  if (!validEmail(email)) errors.email = "Enter a valid email address.";
  if (!message) errors.message = "Tell them a little about your wedding.";
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) errors.wedding_date = "Enter a valid date.";
  if (guests != null && (!Number.isInteger(guests) || guests < 1 || guests > 5000)) errors.guest_count = "Enter a number of guests.";
  if (budget && !(BUDGETS as readonly string[]).includes(budget)) errors.budget = "Choose a budget range.";
  if (input.consent !== "on" && input.consent !== "true") errors.consent = "Please agree so the vendor can contact you.";
  if (Object.keys(errors).length) return { status: "invalid", errors };

  if (!(await allowed(`inquiry:${ctx.visitorKey}`, 3600, 5)) || !(await allowed(`inquiry-email:${email}:${vendor.place_id}`, 86400, 2))) {
    return { status: "limited" };
  }

  const { source, viaPlaceId } = await resolveSource(vendor.place_id, input.via, input.src);
  await sql()`
    insert into inquiries (place_id, source, via_place_id, name, email, phone, wedding_date, location, guest_count, budget, message, consent_at)
    values (${vendor.place_id}, ${source}, ${viaPlaceId}, ${name}, ${email}, ${phone}, ${date || null}, ${location}, ${guests}, ${budget}, ${message}, now())`;

  const notify = ctx.notify ?? sendEmail;
  const [owner] = await sql()<{ to: string }[]>`
    select coalesce(nullif(pr.contact_email, ''), m.email) as "to" from profiles pr join members m on m.id = pr.member_id where pr.place_id = ${vendor.place_id}`;
  const details = [
    `From: ${name} (${email}${phone ? `, ${phone}` : ""})`,
    ...(date ? [`Wedding date: ${date}`] : []),
    ...(location ? [`City or venue: ${location}`] : []),
    ...(guests ? [`Guests: ${guests}`] : []),
    ...(budget ? [`Budget: ${budget}`] : []),
    `Message: ${message}`,
  ];
  await Promise.all([
    owner &&
      notify({
        to: owner.to,
        replyTo: email,
        subject: `New inquiry from ${name}`,
        ...simpleEmail({
          heading: `${name} sent you an inquiry.`,
          lines: [...details, "Reply to this email to answer them directly, and mark the inquiry on your dashboard."],
          button: { label: "Open your inquiries", url: `${site.url}/dashboard/inquiries?place=${vendor.place_id}` },
          footer: "You're getting this because your business shows its profile to couples on Something Clicks.",
        }),
      }).catch((e) => console.error("[inquiries] vendor notice failed", e)),
    notify({
      to: email,
      subject: `Your inquiry to ${vendor.name}`,
      ...simpleEmail({
        heading: `We sent your inquiry to ${vendor.name}.`,
        lines: [
          `${vendor.name} will reply to you at ${email}. Your details go only to them.`,
          `Your message: ${message}`,
        ],
        footer: "You're getting this because you sent an inquiry on Something Clicks.",
      }),
    }).catch((e) => console.error("[inquiries] confirmation failed", e)),
  ]);
  return ok;
}

// ---------------------------------------------------------------------------
// The vendor's inbox
// ---------------------------------------------------------------------------

export type InquiryRow = {
  id: number;
  source: InquirySource;
  via_name: string | null;
  name: string;
  email: string;
  phone: string;
  wedding_date: string | null;
  location: string;
  guest_count: number | null;
  budget: string;
  message: string;
  status: InquiryStatus;
  created_at: Date;
};

export async function inquiriesFor(member: MemberSession, placeId: number): Promise<InquiryRow[]> {
  return sql()<InquiryRow[]>`
    select q.id::int, q.source, v.name as via_name, q.name, q.email, q.phone, to_char(q.wedding_date, 'YYYY-MM-DD') as wedding_date,
           q.location, q.guest_count, q.budget, q.message, q.status, q.created_at
    from inquiries q
    join profiles pr on pr.place_id = q.place_id and pr.member_id = ${member.id}
    left join places v on v.id = q.via_place_id
    where q.place_id = ${placeId}
    order by q.created_at desc
    limit 200`;
}

export async function newInquiryCount(placeId: number): Promise<number> {
  try {
    const [row] = await sql()<{ n: number }[]>`select count(*)::int as n from inquiries where place_id = ${placeId} and status = 'new'`;
    return row?.n ?? 0;
  } catch {
    return 0; // the couples migration isn't applied yet
  }
}

export async function setInquiryStatus(member: MemberSession, placeId: number, id: number, status: string): Promise<boolean> {
  if (!(STATUSES as readonly string[]).includes(status)) return false;
  const rows = await sql()`
    update inquiries q set status = ${status}, status_changed_at = now()
    from profiles pr
    where q.id = ${id} and q.place_id = ${placeId} and pr.place_id = q.place_id and pr.member_id = ${member.id}
    returning q.id`;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type Results = {
  days: number;
  views: Record<InquirySource, number>;
  inquiries: Record<InquirySource, number>;
  booked: number;
  referralVisits: number;
  livePartnerships: number;
  campaigns: { status: string; n: number }[];
};

const zero = () => Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<InquirySource, number>;

export async function resultsFor(placeId: number, days = 30): Promise<Results> {
  const db = sql();
  const [views, inq, [row], campaigns] = await Promise.all([
    db<{ source: InquirySource; n: number }[]>`
      select source, sum(views)::int as n from profile_views where place_id = ${placeId} and day > current_date - ${days}::int group by source`,
    db<{ source: InquirySource; n: number; booked: number }[]>`
      select source, count(*)::int as n, count(*) filter (where status = 'booked')::int as booked
      from inquiries where place_id = ${placeId} and created_at > now() - make_interval(days => ${days}) group by source`,
    db<{ visits: number; live: number }[]>`
      select (select coalesce(sum(clicks), 0)::int from partnership_links where place_id = ${placeId}) as visits,
             (select count(*)::int from partnerships pa join introductions i on i.id = pa.introduction_id
               where pa.stage = 'live' and ${placeId} in (i.from_place, i.to_place)) as live`,
    db<{ status: string; n: number }[]>`select status, count(*)::int as n from campaigns where place_id = ${placeId} group by status`.catch(() => []),
  ]);
  const v = zero();
  for (const r of views) v[r.source] = r.n;
  const q = zero();
  let booked = 0;
  for (const r of inq) {
    q[r.source] = r.n;
    booked += r.booked;
  }
  return { days, views: v, inquiries: q, booked, referralVisits: row?.visits ?? 0, livePartnerships: row?.live ?? 0, campaigns };
}
