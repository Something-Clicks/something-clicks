"use server";

import { PARTNER_TERMS_VERSION } from "@/lib/constants";
import { notifyAdmin, sendEmail } from "@/lib/email";
import { isSupabaseConfigured } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fieldErrors, formToObject, partnerApplicationSchema } from "@/lib/validation";

export async function applyAsPartner(_prev: FormState, form: FormData): Promise<FormState> {
  const successMessage =
    "Thanks — your application is in. We review every application by hand and will email you within two business days.";

  // Bots fill the hidden field; pretend success and store nothing.
  if (form.get("company_website")) return { status: "success", message: successMessage };

  const raw = formToObject(form);
  const parsed = partnerApplicationSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Applications aren't open yet. Please try again soon.", values: raw };
  }

  const a = parsed.data;
  const { error } = await supabaseAdmin().from("partner_applications").insert({
    full_name: a.full_name,
    business_name: a.business_name,
    email: a.email,
    phone: a.phone,
    partner_type: a.partner_type,
    referral_plan: a.referral_plan,
    terms_version: PARTNER_TERMS_VERSION,
    terms_agreed_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return {
        status: "error",
        message: "We already have an application from this email address. We'll be in touch about it soon.",
        values: raw,
      };
    }
    console.error(`[partners] application insert failed: ${error.code}`);
    return { status: "error", message: "Something went wrong saving your application. Please try again.", values: raw };
  }

  await sendEmail({
    to: a.email,
    subject: "We received your Something Clicks partner application",
    text:
      `Hi ${a.full_name},\n\n` +
      "Thanks for applying to the Something Clicks referral partner program. We review every application by hand " +
      "and will email you within two business days.\n\n" +
      "Once you're approved, you'll get your personal referral link, a QR code, and access to your partner portal, " +
      "where you can track referrals and commissions.\n\n" +
      "— Something Clicks",
  });
  await notifyAdmin(
    "New partner application",
    `A new referral partner application is waiting for review (${a.partner_type}). Review it under Admin → Partner applications.`,
  );

  return { status: "success", message: successMessage };
}
