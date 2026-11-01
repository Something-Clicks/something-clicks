import type Stripe from "stripe";
import type { TransactionSql } from "postgres";
import { sql } from "@/lib/db";
import { stripe } from "./plans";

/**
 * Applies one verified Stripe event. Each event runs once (stripe_events),
 * inside a transaction, so a failure leaves nothing half-done and Stripe's
 * retry applies it cleanly. Returns what happened, for logs and tests.
 */
export async function applyEvent(event: Stripe.Event): Promise<string> {
  return sql().begin(async (tx) => {
    const [fresh] = await tx`insert into stripe_events (id, type) values (${event.id}, ${event.type}) on conflict (id) do nothing returning id`;
    if (!fresh) return "duplicate";
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return checkoutCompleted(tx, event.data.object);
      case "invoice.paid":
        return invoicePaid(tx, event.data.object);
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return subscriptionChanged(tx, event.data.object);
      case "charge.refunded":
        return chargeRefunded(tx, event.data.object);
      default:
        return "ignored";
    }
  });
}

const placeOf = (metadata: Stripe.Metadata | null | undefined) => {
  const id = Number(metadata?.place_id);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const memberOf = (metadata: Stripe.Metadata | null | undefined) => Number(metadata?.member_id) || null;
const idOf = (v: string | { id: string } | null | undefined) => (typeof v === "string" ? v : (v?.id ?? null));

/** A paid campaign: record the payment and put it in the admin queue. Memberships are recorded per invoice. */
async function checkoutCompleted(tx: TransactionSql, s: Stripe.Checkout.Session): Promise<string> {
  if (s.mode !== "payment" || s.metadata?.kind !== "campaign") return "checkout (subscription: recorded by invoice.paid)";
  if (s.payment_status !== "paid") return "checkout not paid yet";
  const placeId = placeOf(s.metadata);
  if (!placeId) return "checkout without a business";
  const [purchase] = await tx<{ id: number }[]>`
    insert into purchases (place_id, member_id, kind, checkout_session_id, payment_intent_id, amount_cents, currency)
    values (${placeId}, ${memberOf(s.metadata)}, 'campaign', ${s.id}, ${idOf(s.payment_intent)}, ${s.amount_total ?? 0}, ${s.currency ?? "usd"})
    on conflict (checkout_session_id) do nothing
    returning id::int`;
  if (!purchase) return "campaign already recorded";
  await tx`insert into campaigns (place_id, purchase_id) values (${placeId}, ${purchase.id})`;
  return "campaign recorded";
}

/** The payment intent behind an invoice (newer API versions list it under invoice payments). */
async function invoicePaymentIntent(invoice: Stripe.Invoice): Promise<string | null> {
  try {
    const payments = await stripe().invoicePayments.list({ invoice: invoice.id, limit: 1 });
    return idOf(payments.data[0]?.payment?.payment_intent);
  } catch {
    return null; // refunds then fall back to the lookup in chargeRefunded
  }
}

/** Each paid membership invoice (first month and renewals) is a payment for that business. */
async function invoicePaid(tx: TransactionSql, invoice: Stripe.Invoice): Promise<string> {
  const details = invoice.parent?.subscription_details;
  const metadata = details?.metadata;
  if (metadata?.kind !== "membership") return "invoice for something else";
  const placeId = placeOf(metadata);
  if (!placeId || !invoice.id) return "invoice without a business";
  const [row] = await tx<{ id: number }[]>`
    insert into purchases (place_id, member_id, kind, invoice_id, payment_intent_id, subscription_id, amount_cents, currency)
    values (${placeId}, ${memberOf(metadata)}, 'membership', ${invoice.id}, ${await invoicePaymentIntent(invoice)}, ${idOf(details?.subscription)},
            ${invoice.amount_paid}, ${invoice.currency})
    on conflict (invoice_id) do nothing
    returning id::int`;
  return row ? "membership payment recorded" : "membership payment already recorded";
}

/** Mirrors a membership's status. A late event for an old subscription never overwrites a newer live one. */
async function subscriptionChanged(tx: TransactionSql, sub: Stripe.Subscription): Promise<string> {
  if (sub.metadata?.kind !== "membership") return "subscription for something else";
  const placeId = placeOf(sub.metadata);
  if (!placeId) return "subscription without a business";
  const periodEnd = sub.items.data[0]?.current_period_end ?? null;
  await tx`
    insert into memberships (place_id, subscription_id, status, current_period_end, cancel_at_period_end)
    values (${placeId}, ${sub.id}, ${sub.status}, ${periodEnd ? new Date(periodEnd * 1000) : null}, ${sub.cancel_at_period_end})
    on conflict (place_id) do update set
      subscription_id = excluded.subscription_id, status = excluded.status,
      current_period_end = excluded.current_period_end, cancel_at_period_end = excluded.cancel_at_period_end
    where memberships.subscription_id = excluded.subscription_id
       or memberships.status not in ('active', 'trialing', 'past_due')`;
  return `membership ${sub.status}`;
}

/** Full or partial refunds, for campaigns and membership invoices. A fully refunded campaign leaves the queue. */
async function chargeRefunded(tx: TransactionSql, charge: Stripe.Charge): Promise<string> {
  const pi = idOf(charge.payment_intent);
  if (!pi) return "refund without a payment intent";
  const status = charge.amount_refunded >= charge.amount ? "refunded" : "partially_refunded";
  let rows = await tx<{ id: number; kind: string }[]>`
    update purchases set status = ${status}, amount_refunded_cents = ${charge.amount_refunded}
    where payment_intent_id = ${pi} returning id::int, kind`;
  if (!rows.length) {
    // A membership invoice recorded before its payment intent was known: find the invoice by payment.
    const found = await stripe()
      .invoicePayments.list({ payment: { type: "payment_intent", payment_intent: pi }, limit: 1 })
      .catch(() => null);
    const invoiceId = idOf(found?.data[0]?.invoice);
    if (invoiceId) {
      rows = await tx<{ id: number; kind: string }[]>`
        update purchases set status = ${status}, amount_refunded_cents = ${charge.amount_refunded}, payment_intent_id = ${pi}
        where invoice_id = ${invoiceId} returning id::int, kind`;
    }
  }
  if (!rows.length) return "refund for an unknown payment";
  if (status === "refunded" && rows[0].kind === "campaign") {
    await tx`update campaigns set status = 'cancelled' where purchase_id = ${rows[0].id} and status <> 'done'`;
  }
  return `${rows[0].kind} ${status}`;
}
