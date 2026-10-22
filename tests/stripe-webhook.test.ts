import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleStripeEvent, verifyStripeEvent, type StripeWebhookStore } from "@/lib/stripe-webhook";

const SECRET = "whsec_test_secret";
const stripeClient = new Stripe("sk_test_dummy");

function event(type: string, object: Record<string, unknown>, id = `evt_${Math.random().toString(36).slice(2)}`) {
  return { id, object: "event", type, data: { object } } as unknown as Stripe.Event;
}

const session = (overrides: Record<string, unknown> = {}) => ({
  id: "cs_test_1",
  object: "checkout.session",
  mode: "payment",
  payment_status: "paid",
  payment_intent: "pi_1",
  amount_total: 50000,
  currency: "usd",
  ...overrides,
});

/** In-memory store with the same idempotency rules as the SQL functions. */
class MemoryStore implements StripeWebhookStore {
  events = new Map<string, string>();
  purchase = { status: "pending", credited: 0, refundedCents: 0, creditsRefunded: 0, credits: 5, amount: 50000 };
  calls: string[] = [];

  async beginEvent(id: string) {
    const status = this.events.get(id);
    if (!status) {
      this.events.set(id, "received");
      return "new" as const;
    }
    return status === "processed" ? ("done" as const) : ("retry" as const);
  }
  async finishEvent(id: string, ok: boolean) {
    this.events.set(id, ok ? "processed" : "failed");
  }
  async creditPurchasePaid({ amountCents }: { amountCents: number | null }) {
    this.calls.push("credit");
    if (["paid", "refunded", "partially_refunded"].includes(this.purchase.status)) return "already_credited" as const;
    if (amountCents !== this.purchase.amount) {
      this.purchase.status = "needs_review";
      return "amount_mismatch" as const;
    }
    this.purchase.status = "paid";
    this.purchase.credited += this.purchase.credits;
    return "credited" as const;
  }
  async setPurchaseStatus(_s: string, status: "processing" | "failed" | "expired") {
    this.calls.push(`status:${status}`);
    if (!["pending", "processing"].includes(this.purchase.status)) return "no_change" as const;
    this.purchase.status = status;
    return "updated" as const;
  }
  async recordRefund(_pi: string, amount: number) {
    this.calls.push(`refund:${amount}`);
    const p = this.purchase;
    if (amount <= p.refundedCents) return "no_change";
    const target = Math.min(p.credits, Math.ceil((p.credits * amount) / p.amount));
    p.credited -= target - p.creditsRefunded;
    p.creditsRefunded = target;
    p.refundedCents = amount;
    p.status = amount >= p.amount ? "refunded" : "partially_refunded";
    return "recorded";
  }
}

describe("verifyStripeEvent", () => {
  const payload = JSON.stringify({ id: "evt_sig", object: "event", type: "checkout.session.completed", data: { object: session() } });

  it("accepts a correctly signed payload", () => {
    const header = stripeClient.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect(verifyStripeEvent(stripeClient, payload, header, SECRET)?.id).toBe("evt_sig");
  });
  it("rejects a wrong secret, a tampered body, or a missing header", () => {
    const header = stripeClient.webhooks.generateTestHeaderString({ payload, secret: SECRET });
    expect(verifyStripeEvent(stripeClient, payload, header, "whsec_other")).toBeNull();
    expect(verifyStripeEvent(stripeClient, payload.replace("50000", "1"), header, SECRET)).toBeNull();
    expect(verifyStripeEvent(stripeClient, payload, null, SECRET)).toBeNull();
    expect(verifyStripeEvent(stripeClient, payload, "t=1,v1=deadbeef", SECRET)).toBeNull();
  });
});

describe("handleStripeEvent", () => {
  let store: MemoryStore;
  beforeEach(() => {
    store = new MemoryStore();
  });

  it("credits a paid checkout once, even when the event is delivered twice", async () => {
    const e = event("checkout.session.completed", session());
    expect(await handleStripeEvent(e, store)).toEqual({ status: 200, result: "ok" });
    expect(await handleStripeEvent(e, store)).toEqual({ status: 200, result: "duplicate" });
    expect(store.purchase.credited).toBe(5);
    expect(store.calls.filter((c) => c === "credit")).toHaveLength(1);
  });

  it("does not double-credit when different events report the same payment", async () => {
    await handleStripeEvent(event("checkout.session.completed", session()), store);
    await handleStripeEvent(event("checkout.session.async_payment_succeeded", session()), store);
    expect(store.purchase.credited).toBe(5);
  });

  it("holds async payments as processing until they succeed", async () => {
    await handleStripeEvent(event("checkout.session.completed", session({ payment_status: "unpaid" })), store);
    expect(store.purchase).toMatchObject({ status: "processing", credited: 0 });
    await handleStripeEvent(event("checkout.session.async_payment_succeeded", session()), store);
    expect(store.purchase).toMatchObject({ status: "paid", credited: 5 });
  });

  it("never credits a failed async payment", async () => {
    await handleStripeEvent(event("checkout.session.completed", session({ payment_status: "unpaid" })), store);
    await handleStripeEvent(event("checkout.session.async_payment_failed", session({ payment_status: "unpaid" })), store);
    expect(store.purchase).toMatchObject({ status: "failed", credited: 0 });
  });

  it("does not let a late expiry or failure undo a paid purchase", async () => {
    await handleStripeEvent(event("checkout.session.completed", session()), store);
    await handleStripeEvent(event("checkout.session.expired", session()), store);
    expect(store.purchase.status).toBe("paid");
  });

  it("flags amount mismatches for review, credits nothing, and alerts admin", async () => {
    const alert = vi.fn(async () => {});
    const r = await handleStripeEvent(event("checkout.session.completed", session({ amount_total: 100 })), store, alert);
    expect(r).toEqual({ status: 200, result: "amount_mismatch" });
    expect(store.purchase).toMatchObject({ status: "needs_review", credited: 0 });
    expect(alert).toHaveBeenCalledOnce();
  });

  it("removes credits for refunds, rounding up, and ignores replays", async () => {
    await handleStripeEvent(event("checkout.session.completed", session()), store);
    const partial = event("charge.refunded", { id: "ch_1", payment_intent: "pi_1", amount_refunded: 15000 });
    await handleStripeEvent(partial, store);
    expect(store.purchase).toMatchObject({ status: "partially_refunded", credited: 3, creditsRefunded: 2 });
    await handleStripeEvent(partial, store);
    await handleStripeEvent(event("charge.refunded", { id: "ch_1", payment_intent: "pi_1", amount_refunded: 15000 }), store);
    expect(store.purchase.credited).toBe(3);
    await handleStripeEvent(event("charge.refunded", { id: "ch_1", payment_intent: "pi_1", amount_refunded: 50000 }), store);
    expect(store.purchase).toMatchObject({ status: "refunded", credited: 0 });
  });

  it("ignores unrelated events and non-payment sessions", async () => {
    expect((await handleStripeEvent(event("customer.created", {}), store)).result).toBe("ignored");
    expect((await handleStripeEvent(event("checkout.session.completed", session({ mode: "subscription" })), store)).result).toBe(
      "ignored",
    );
    expect(store.calls).toHaveLength(0);
  });

  it("returns 500 on a database error so Stripe retries, then succeeds on retry", async () => {
    const e = event("checkout.session.completed", session());
    const failing = Object.assign(Object.create(store), {
      creditPurchasePaid: async () => {
        throw new Error("db down");
      },
    }) as MemoryStore;
    expect(await handleStripeEvent(e, failing)).toEqual({ status: 500, result: "error" });
    expect(store.events.get(e.id)).toBe("failed");
    expect(await handleStripeEvent(e, store)).toEqual({ status: 200, result: "ok" });
    expect(store.purchase.credited).toBe(5);
  });
});
