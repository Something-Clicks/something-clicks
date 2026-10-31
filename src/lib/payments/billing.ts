import { site } from "@/content/site";
import { sql } from "@/lib/db";
import type { OwnedPlace } from "@/lib/members/network";
import type { MemberSession } from "@/lib/members/session";
import { LIVE_MEMBERSHIP, plans, priceId, stripe, type PlanKind } from "./plans";

/** Only the verified owner of a claimed business can buy. Claimed-but-unverified businesses can't yet. */
export const canBuy = (place: Pick<OwnedPlace, "state">) => place.state === "verified" || place.state === "member";

export type Membership = { status: string; current_period_end: Date | null; cancel_at_period_end: boolean };
export type PurchaseRow = { id: number; kind: PlanKind; amount_cents: number; status: string; created_at: Date; campaign_status: string | null };

export async function billingFor(placeId: number): Promise<{ membership: Membership | null; purchases: PurchaseRow[]; hasCustomer: boolean }> {
  const [membership] = await sql()<Membership[]>`
    select status, current_period_end, cancel_at_period_end from memberships where place_id = ${placeId}`;
  const purchases = await sql()<PurchaseRow[]>`
    select p.id::int, p.kind, p.amount_cents, p.status, p.created_at, c.status as campaign_status
    from purchases p left join campaigns c on c.purchase_id = p.id
    where p.place_id = ${placeId} order by p.created_at desc limit 24`;
  const [customer] = await sql()`select 1 from stripe_customers where place_id = ${placeId}`;
  return { membership: membership ?? null, purchases, hasCustomer: Boolean(customer) };
}

export const membershipLive = (m: Membership | null) => Boolean(m && (LIVE_MEMBERSHIP as readonly string[]).includes(m.status));

/** One Stripe customer per business, created on first checkout. */
async function customerFor(place: OwnedPlace, member: MemberSession): Promise<string> {
  const [row] = await sql()<{ customer_id: string }[]>`select customer_id from stripe_customers where place_id = ${place.id}`;
  if (row) return row.customer_id;
  const customer = await stripe().customers.create(
    { email: member.email, name: place.name, metadata: { place_id: String(place.id) } },
    { idempotencyKey: `customer-place-${place.id}` },
  );
  const [saved] = await sql()<{ customer_id: string }[]>`
    insert into stripe_customers (place_id, customer_id, member_id) values (${place.id}, ${customer.id}, ${member.id})
    on conflict (place_id) do update set place_id = excluded.place_id
    returning customer_id`;
  return saved.customer_id;
}

export type CheckoutStart = { ok: true; url: string } | { ok: false; error: string };

/**
 * A hosted Stripe Checkout session for one plan. The business and plan ride
 * in metadata (and on the subscription), so the webhook can link the payment.
 * client_reference_id carries the PromoteKit referral, when there is one.
 */
export async function startCheckout(kind: PlanKind, place: OwnedPlace, member: MemberSession, referral: string | null): Promise<CheckoutStart> {
  if (!canBuy(place)) return { ok: false, error: "Your business needs to be verified before you can buy a plan." };
  const price = priceId(kind);
  if (!price) return { ok: false, error: "Payments aren't set up yet." };
  if (kind === "membership" && membershipLive((await billingFor(place.id)).membership)) {
    return { ok: false, error: "You're already a member. Manage your membership from Billing." };
  }
  const metadata = { place_id: String(place.id), member_id: String(member.id), kind, ...(referral ? { referral } : {}) };
  const back = `${site.url}/dashboard/plans?place=${place.id}`;
  const session = await stripe().checkout.sessions.create({
    mode: plans[kind].mode,
    customer: await customerFor(place, member),
    line_items: [{ price, quantity: 1 }],
    ...(referral ? { client_reference_id: referral } : {}),
    metadata,
    ...(kind === "campaign" ? { payment_intent_data: { metadata } } : { subscription_data: { metadata } }),
    success_url: `${back}&done=${kind}`,
    cancel_url: back,
  });
  return session.url ? { ok: true, url: session.url } : { ok: false, error: "Stripe didn't return a checkout page. Please try again." };
}

/** Stripe's Customer Portal for cancelling, changing cards and invoices. */
export async function portalUrl(placeId: number): Promise<string | null> {
  const [row] = await sql()<{ customer_id: string }[]>`select customer_id from stripe_customers where place_id = ${placeId}`;
  if (!row) return null;
  const session = await stripe().billingPortal.sessions.create({
    customer: row.customer_id,
    return_url: `${site.url}/dashboard/plans?place=${placeId}`,
  });
  return session.url;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type CampaignRow = {
  id: number;
  place_id: number;
  business: string;
  locality: string;
  region: string;
  email: string | null;
  status: string;
  notes: string;
  amount_cents: number;
  purchase_status: string;
  created_at: Date;
};

export async function listCampaigns(): Promise<CampaignRow[]> {
  return sql()<CampaignRow[]>`
    select c.id::int, c.place_id::int, p.name as business, p.locality, p.region, m.email, c.status, c.notes,
           pu.amount_cents, pu.status as purchase_status, c.created_at
    from campaigns c
    join places p on p.id = c.place_id
    join purchases pu on pu.id = c.purchase_id
    left join members m on m.id = pu.member_id
    order by (c.status in ('done', 'cancelled')), c.created_at`;
}

export async function setCampaign(id: number, status: string, notes: string) {
  if (!["new", "in_progress", "done", "cancelled"].includes(status)) throw new Error("Unknown status");
  await sql()`update campaigns set status = ${status}, notes = ${notes.slice(0, 2000)} where id = ${id}`;
}

export type MembershipRow = { place_id: number; business: string; locality: string; region: string; status: string; current_period_end: Date | null; cancel_at_period_end: boolean };

export async function listMemberships(): Promise<MembershipRow[]> {
  return sql()<MembershipRow[]>`
    select ms.place_id::int, p.name as business, p.locality, p.region, ms.status, ms.current_period_end, ms.cancel_at_period_end
    from memberships ms join places p on p.id = ms.place_id
    order by (ms.status = any(${[...LIVE_MEMBERSHIP]}::text[])) desc, ms.current_period_end desc nulls last`;
}
