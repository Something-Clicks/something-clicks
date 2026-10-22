"use server";

import { redirect } from "next/navigation";
import { requireBuyerUser } from "@/lib/auth";
import { loadBuyerProfile } from "@/lib/buyers";
import { siteUrl } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Starts a Stripe Checkout for a credit pack. Credits are NOT added here or on the success
 * redirect: only the verified Stripe webhook adds credits once payment is confirmed.
 */
export async function startCheckout(form: FormData) {
  const user = await requireBuyerUser();
  const buyer = await loadBuyerProfile({ userId: user.id });
  if (!buyer) redirect("/onboarding");
  if (buyer.status !== "approved") redirect("/dashboard?error=not_approved");

  const db = supabaseAdmin();
  const { data: pack } = await db
    .from("credit_packs")
    .select("id, name, credits, price_cents")
    .eq("id", String(form.get("pack_id") ?? ""))
    .eq("active", true)
    .maybeSingle();
  if (!pack) redirect("/dashboard?error=pack_unavailable");

  let checkoutUrl: string | null = null;
  try {
    let customerId = buyer.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe().customers.create(
        { email: buyer.email, name: buyer.company_name, metadata: { buyer_id: buyer.id } },
        { idempotencyKey: `buyer-customer-${buyer.id}` },
      );
      customerId = customer.id;
      await db.from("buyers").update({ stripe_customer_id: customerId }).eq("id", buyer.id).is("stripe_customer_id", null);
    }

    const { data: purchase, error } = await db
      .from("credit_purchases")
      .insert({
        buyer_id: buyer.id,
        pack_id: pack.id,
        pack_name: pack.name,
        credits: pack.credits,
        amount_cents: pack.price_cents,
      })
      .select("id")
      .single();
    if (error || !purchase) throw new Error(`purchase insert failed: ${error?.code}`);

    const metadata = { purchase_id: purchase.id, buyer_id: buyer.id };
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        customer: customerId,
        client_reference_id: purchase.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: pack.price_cents,
              product_data: {
                name: `${pack.name}: ${pack.credits} walkthrough appointment credit${pack.credits === 1 ? "" : "s"}`,
              },
            },
          },
        ],
        metadata,
        payment_intent_data: { metadata },
        success_url: `${siteUrl()}/dashboard?checkout=success`,
        cancel_url: `${siteUrl()}/dashboard?checkout=cancelled`,
      },
      { idempotencyKey: `checkout-${purchase.id}` },
    );

    const { error: updateError } = await db
      .from("credit_purchases")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", purchase.id);
    if (updateError) throw new Error(`purchase update failed: ${updateError.code}`);
    checkoutUrl = session.url;
  } catch (err) {
    console.error(`[checkout] failed: ${err instanceof Error ? err.message : "error"}`);
    redirect("/dashboard?error=checkout_failed");
  }

  if (!checkoutUrl) redirect("/dashboard?error=checkout_failed");
  redirect(checkoutUrl);
}
