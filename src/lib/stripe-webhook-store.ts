import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { StripeWebhookStore } from "@/lib/stripe-webhook";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseAdmin().rpc(fn, args);
  if (error) throw new Error(`${fn} failed: ${error.message}`);
  return data as T;
}

export const supabaseWebhookStore: StripeWebhookStore = {
  beginEvent: (id, type) => rpc("begin_stripe_event", { p_id: id, p_type: type }),
  finishEvent: (id, ok, error) =>
    rpc("finish_stripe_event", { p_id: id, p_ok: ok, p_error: error ?? null }),
  creditPurchasePaid: ({ sessionId, paymentIntentId, amountCents, currency }) =>
    rpc("credit_purchase_paid", {
      p_session_id: sessionId,
      p_payment_intent_id: paymentIntentId,
      p_amount_cents: amountCents,
      p_currency: currency ?? "",
    }),
  setPurchaseStatus: (sessionId, status, paymentIntentId) =>
    rpc("set_purchase_status", {
      p_session_id: sessionId,
      p_status: status,
      p_payment_intent_id: paymentIntentId,
    }),
  recordRefund: (paymentIntentId, amount) =>
    rpc("record_purchase_refund", { p_payment_intent_id: paymentIntentId, p_amount_refunded_cents: amount }),
};
