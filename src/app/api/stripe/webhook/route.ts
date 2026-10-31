import { applyEvent } from "@/lib/payments/webhook";
import { stripe } from "@/lib/payments/plans";

/**
 * Stripe webhook. The signature is checked against STRIPE_WEBHOOK_SECRET on
 * the raw body before anything is read; unsigned or tampered requests get 400.
 * A failure returns 500 so Stripe retries.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) return new Response("Payments aren't configured.", { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature.", { status: 400 });
  const body = await request.text();
  let event;
  try {
    event = await stripe().webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return new Response("Invalid signature.", { status: 400 });
  }
  try {
    const result = await applyEvent(event);
    return Response.json({ received: true, result });
  } catch (error) {
    console.error("[stripe] webhook failed", event.type, event.id, error);
    return new Response("Webhook failed; Stripe will retry.", { status: 500 });
  }
}
