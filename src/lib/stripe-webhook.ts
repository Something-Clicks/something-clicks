import type Stripe from "stripe";

/** Database operations the webhook needs. Implemented with Supabase RPCs in production. */
export interface StripeWebhookStore {
  beginEvent(id: string, type: string): Promise<"new" | "retry" | "done">;
  finishEvent(id: string, ok: boolean, error?: string): Promise<void>;
  creditPurchasePaid(input: {
    sessionId: string;
    paymentIntentId: string | null;
    amountCents: number | null;
    currency: string | null;
  }): Promise<"credited" | "already_credited" | "not_found" | "amount_mismatch">;
  setPurchaseStatus(
    sessionId: string,
    status: "processing" | "failed" | "expired",
    paymentIntentId: string | null,
  ): Promise<"updated" | "no_change">;
  recordRefund(paymentIntentId: string, amountRefundedCents: number): Promise<string>;
}

export type WebhookOutcome =
  | { status: 200; result: string }
  | { status: 400; result: string }
  | { status: 500; result: string };

export function verifyStripeEvent(
  stripeClient: Pick<Stripe, "webhooks">,
  rawBody: string,
  signature: string | null,
  secret: string,
): Stripe.Event | null {
  if (!signature) return null;
  try {
    return stripeClient.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return null;
  }
}

const idOf = (value: string | { id: string } | null | undefined): string | null =>
  value == null ? null : typeof value === "string" ? value : value.id;

/**
 * Applies one verified Stripe event. Idempotent on event id, and every database step is
 * idempotent on its own, so concurrent or repeated deliveries cannot double-credit.
 * Credits are only granted when Stripe reports the payment as paid, never from a redirect.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  store: StripeWebhookStore,
  alert: (subject: string, text: string) => Promise<void> = async () => {},
): Promise<WebhookOutcome> {
  const begin = await store.beginEvent(event.id, event.type);
  if (begin === "done") return { status: 200, result: "duplicate" };

  try {
    const result = await applyEvent(event, store, alert);
    await store.finishEvent(event.id, true, result === "ok" || result === "ignored" ? undefined : result);
    return { status: 200, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    await store.finishEvent(event.id, false, message).catch(() => {});
    // 500 makes Stripe retry later.
    return { status: 500, result: "error" };
  }
}

async function applyEvent(
  event: Stripe.Event,
  store: StripeWebhookStore,
  alert: (subject: string, text: string) => Promise<void>,
): Promise<string> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.mode !== "payment") return "ignored";
      const paymentIntentId = idOf(session.payment_intent);

      if (session.payment_status !== "paid") {
        // Async methods (e.g. bank debit) complete checkout before money arrives.
        await store.setPurchaseStatus(session.id, "processing", paymentIntentId);
        return "processing";
      }

      const outcome = await store.creditPurchasePaid({
        sessionId: session.id,
        paymentIntentId,
        amountCents: session.amount_total,
        currency: session.currency,
      });
      if (outcome === "amount_mismatch") {
        await alert(
          "Purchase needs review",
          `Stripe checkout session ${session.id} was paid but the amount did not match our record. ` +
            "No credits were added. Review it under Admin → Buyers.",
        );
      }
      return outcome === "credited" || outcome === "already_credited" ? "ok" : outcome;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      await store.setPurchaseStatus(session.id, "failed", idOf(session.payment_intent));
      return "ok";
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      await store.setPurchaseStatus(session.id, "expired", idOf(session.payment_intent));
      return "ok";
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId = idOf(charge.payment_intent);
      if (!paymentIntentId) return "ignored";
      const outcome = await store.recordRefund(paymentIntentId, charge.amount_refunded);
      return outcome === "recorded" || outcome === "no_change" ? "ok" : outcome;
    }

    default:
      return "ignored";
  }
}
