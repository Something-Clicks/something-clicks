import { NextResponse } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import { notifyAdmin } from "@/lib/email";
import { stripe } from "@/lib/stripe";
import { handleStripeEvent, verifyStripeEvent } from "@/lib/stripe-webhook";
import { supabaseWebhookStore } from "@/lib/stripe-webhook-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !isSupabaseConfigured()) {
    // 503 makes Stripe retry later, once the environment is configured.
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }
  // Signature must be checked against the exact raw body.
  const rawBody = await request.text();
  const event = verifyStripeEvent(stripe(), rawBody, request.headers.get("stripe-signature"), env.stripeWebhookSecret());
  if (!event) return NextResponse.json({ error: "invalid signature" }, { status: 400 });

  const outcome = await handleStripeEvent(event, supabaseWebhookStore, notifyAdmin);
  return NextResponse.json({ received: true, result: outcome.result }, { status: outcome.status });
}
