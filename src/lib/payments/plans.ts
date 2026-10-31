import Stripe from "stripe";
import { placeholder, type Placeholder } from "@/content/site";

/**
 * Paid plans. Prices live in Stripe; ids come from the environment so test
 * and live mode can differ. Claiming a business and seeing matches stay free.
 */
export type PlanKind = "campaign" | "membership";

export const plans: Record<PlanKind, { name: string; price: string; cadence: string; mode: "payment" | "subscription"; env: string; blurb: Placeholder | string }> = {
  campaign: {
    name: "Managed campaign",
    price: "$299",
    cadence: "one time",
    mode: "payment",
    env: "STRIPE_PRICE_CAMPAIGN",
    // [PLACEHOLDER] Matt to describe what a managed campaign includes.
    blurb: placeholder("What a managed campaign includes goes here."),
  },
  membership: {
    name: "Membership",
    price: "$149",
    cadence: "per month",
    mode: "subscription",
    env: "STRIPE_PRICE_MEMBERSHIP",
    // [PLACEHOLDER] Matt to describe what membership includes.
    blurb: placeholder("What membership includes goes here. Cancel any time."),
  },
};

export const isPlanKind = (v: unknown): v is PlanKind => v === "campaign" || v === "membership";

export const priceId = (kind: PlanKind, env: Record<string, string | undefined> = process.env) => env[plans[kind].env]?.trim() || "";

/** Checkout needs the secret key and both prices; the webhook also needs its signing secret. */
export function paymentsConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.STRIPE_SECRET_KEY && priceId("campaign", env) && priceId("membership", env));
}

let client: Stripe | null = null;

/** The Stripe client (server only). */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: "Something Clicks" } });
  return client;
}

/** For tests: use a stand-in client. */
export const setStripeForTests = (s: Stripe | null) => {
  client = s;
};

/** A PromoteKit referral id as it may be passed to Checkout: short, plain characters only. */
export const cleanReferral = (v: unknown): string | null =>
  typeof v === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(v) ? v : null;

/** Memberships Stripe still counts as live (past_due: a renewal failed and Stripe is retrying). */
export const LIVE_MEMBERSHIP = ["active", "trialing", "past_due"] as const;
