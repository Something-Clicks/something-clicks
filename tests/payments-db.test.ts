/**
 * Paid plans against a real database: the Stripe webhook (real signature
 * checks, Stripe's API stubbed), checkout parameters, and the rule that
 * payment never touches matching. Needs TEST_DATABASE_URL.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import Stripe from "stripe";

describe("payment never affects matching or ranking", () => {
  it("keeps payment tables out of matching and search", () => {
    const dir = join(__dirname, "..", "supabase", "migrations");
    const matching = readdirSync(dir)
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .flatMap((sqlText) => sqlText.split(/create or replace function/i).filter((s) => /^\s*(compute_matches|needs_confirmation)/i.test(s)));
    const search = readFileSync(join(__dirname, "..", "src", "lib", "network", "search.ts"), "utf8");
    for (const text of [...matching, search]) expect(text).not.toMatch(/purchases|memberships|campaigns|stripe_/);
  });
});

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;
if (URL) {
  process.env.SUPABASE_DB_URL = URL;
  process.env.STRIPE_SECRET_KEY = "sk_test_local";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_test";
  process.env.STRIPE_PRICE_CAMPAIGN = "price_campaign";
  process.env.STRIPE_PRICE_MEMBERSHIP = "price_membership";
}

d("Stripe payments", async () => {
  const { setStripeForTests } = await import("@/lib/payments/plans");
  const { startCheckout } = await import("@/lib/payments/billing");
  const { POST } = await import("@/app/api/stripe/webhook/route");
  const db = URL ? postgres(URL, { max: 1 }) : (null as unknown as postgres.Sql);
  const client = new Stripe("sk_test_local");
  const calls: Record<string, unknown[]> = { sessions: [], customers: [] };
  let placeId = 0;
  let unverifiedId = 0;
  let memberId = 0;

  // Stand-ins for the Stripe API; webhook signatures are verified for real.
  Object.assign(client.customers, { create: async (p: unknown) => (calls.customers.push(p), { id: "cus_test" }) });
  Object.assign(client.checkout.sessions, { create: async (p: unknown) => (calls.sessions.push(p), { url: "https://checkout.stripe.test/s" }) });
  Object.assign(client.invoicePayments, {
    list: async (p: { invoice?: string; payment?: { payment_intent: string } }) =>
      p.invoice ? { data: [{ payment: { payment_intent: "pi_membership_1" } }] } : { data: [{ invoice: "in_1" }] },
  });

  const send = async (type: string, object: object, id = `evt_${type}_${Math.random()}`) => {
    const payload = JSON.stringify({ id, object: "event", type, data: { object }, api_version: "2026-10-28.endive", created: 0, livemode: false });
    const header = client.webhooks.generateTestHeaderString({ payload, secret: "whsec_local_test" });
    const res = await POST(new Request("http://x/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": header } }));
    return { status: res.status, body: res.status === 200 ? await res.json() : await res.text() };
  };

  beforeAll(async () => {
    setStripeForTests(client);
    const [m] = await db<{ id: number }[]>`insert into members (email) values ('owner@sc-pay.example') returning id::int`;
    memberId = m.id;
    for (const state of ["verified", "claimed"] as const) {
      const [p] = await db<{ id: number }[]>`
        insert into places (source, name, category_id, geog, state)
        values ('member', ${"Pay test " + state}, 'photographers', st_setsrid(st_makepoint(-150, 10), 4326)::geography, ${state})
        returning id::int`;
      if (state === "verified") placeId = p.id;
      else unverifiedId = p.id;
    }
  });

  afterAll(async () => {
    setStripeForTests(null);
    await db`delete from places where id in (${placeId}, ${unverifiedId})`;
    await db`delete from members where id = ${memberId}`;
    await db`delete from stripe_events where id like 'evt_%'`;
    await db.end();
  });

  const owned = (id: number, state: string) =>
    ({ id, name: "Pay test", state, category_id: "photographers" }) as unknown as Parameters<typeof startCheckout>[1];
  const member = () => ({ id: memberId, email: "owner@sc-pay.example" }) as unknown as Parameters<typeof startCheckout>[2];

  it("only verified owners get a checkout, with the business attached", async () => {
    expect(await startCheckout("campaign", owned(unverifiedId, "claimed"), member())).toMatchObject({ ok: false });
    expect(await startCheckout("campaign", owned(placeId, "verified"), member())).toEqual({ ok: true, url: "https://checkout.stripe.test/s" });
    const s = calls.sessions[0] as Record<string, unknown>;
    expect(s).toMatchObject({
      mode: "payment",
      customer: "cus_test",
      line_items: [{ price: "price_campaign", quantity: 1 }],
      metadata: { place_id: String(placeId), kind: "campaign" },
      payment_intent_data: { metadata: { kind: "campaign" } },
    });
    expect(s).not.toHaveProperty("client_reference_id");
    await startCheckout("membership", owned(placeId, "verified"), member());
    const sub = calls.sessions[1] as Record<string, unknown>;
    expect(sub).toMatchObject({
      mode: "subscription",
      metadata: { kind: "membership" },
      subscription_data: { metadata: { kind: "membership" } },
    });
    expect(calls.customers).toHaveLength(1); // one Stripe customer per business
  });

  it("rejects unsigned or tampered webhooks", async () => {
    const res = await POST(new Request("http://x", { method: "POST", body: "{}", headers: { "stripe-signature": "t=1,v1=bad" } }));
    expect(res.status).toBe(400);
  });

  it("records a campaign once and queues it", async () => {
    const session = {
      id: "cs_test_1", object: "checkout.session", mode: "payment", payment_status: "paid", amount_total: 29900, currency: "usd",
      payment_intent: "pi_campaign_1", metadata: { place_id: String(placeId), member_id: String(memberId), kind: "campaign" },
    };
    expect((await send("checkout.session.completed", session, "evt_cs_1")).body).toMatchObject({ result: "campaign recorded" });
    expect((await send("checkout.session.completed", session, "evt_cs_1")).body).toMatchObject({ result: "duplicate" });
    const [p] = await db`select kind, amount_cents, status from purchases where place_id = ${placeId}`;
    expect(p).toEqual({ kind: "campaign", amount_cents: 29900, status: "paid" });
    const [c] = await db`select status from campaigns where place_id = ${placeId}`;
    expect(c.status).toBe("new");
  });

  it("tracks a membership: invoice, status, cancellation", async () => {
    const meta = { place_id: String(placeId), member_id: String(memberId), kind: "membership" };
    const sub = (status: string, cancel = false) => ({
      id: "sub_1", object: "subscription", status, cancel_at_period_end: cancel, metadata: meta,
      items: { data: [{ current_period_end: 1893456000 }] },
    });
    expect((await send("customer.subscription.created", sub("active"))).body).toMatchObject({ result: "membership active" });
    const invoice = { id: "in_1", object: "invoice", amount_paid: 14900, currency: "usd", parent: { type: "subscription_details", subscription_details: { subscription: "sub_1", metadata: meta } } };
    expect((await send("invoice.paid", invoice)).body).toMatchObject({ result: "membership payment recorded" });
    await send("customer.subscription.updated", sub("active", true));
    let [m] = await db`select status, cancel_at_period_end from memberships where place_id = ${placeId}`;
    expect(m).toEqual({ status: "active", cancel_at_period_end: true });
    await send("customer.subscription.deleted", sub("canceled"));
    [m] = await db`select status from memberships where place_id = ${placeId}`;
    expect(m.status).toBe("canceled");
    const [inv] = await db`select payment_intent_id, amount_cents from purchases where invoice_id = 'in_1'`;
    expect(inv).toEqual({ payment_intent_id: "pi_membership_1", amount_cents: 14900 });
  });

  it("handles full and partial refunds", async () => {
    const charge = (pi: string, refunded: number, amount: number) => ({ id: `ch_${pi}`, object: "charge", payment_intent: pi, amount, amount_refunded: refunded });
    expect((await send("charge.refunded", charge("pi_membership_1", 5000, 14900))).body).toMatchObject({ result: "membership partially_refunded" });
    expect((await send("charge.refunded", charge("pi_campaign_1", 29900, 29900))).body).toMatchObject({ result: "campaign refunded" });
    const [c] = await db`select status from campaigns where place_id = ${placeId}`;
    expect(c.status).toBe("cancelled");
    const rows = await db`select kind, status, amount_refunded_cents from purchases where place_id = ${placeId} order by kind`;
    expect(rows).toEqual([
      { kind: "campaign", status: "refunded", amount_refunded_cents: 29900 },
      { kind: "membership", status: "partially_refunded", amount_refunded_cents: 5000 },
    ]);
  });
});
