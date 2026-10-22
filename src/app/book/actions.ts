"use server";

import { cookies, headers } from "next/headers";
import { attributionWindowDays, resolveAttribution } from "@/lib/attribution";
import { ATTRIBUTION_COOKIE, BUSINESS_CONSENT_VERSION } from "@/lib/constants";
import { notifyAdmin, sendEmail } from "@/lib/email";
import { isSupabaseConfigured } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { addressKey, bookingRequestSchema, fieldErrors, formToObject } from "@/lib/validation";

const FOLLOW_UP =
  "Thanks — we have your request. We're matching it with one commercial cleaning company that serves your area, " +
  "and we'll follow up within one business day to set up your walkthrough.";

function clientIp(forwardedFor: string | null): string | null {
  const ip = forwardedFor?.split(",")[0]?.trim();
  return ip && /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : null;
}

export async function requestWalkthrough(_prev: FormState, form: FormData): Promise<FormState> {
  if (form.get("company_website")) return { status: "success", message: FOLLOW_UP };

  const raw = formToObject(form);
  const parsed = bookingRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  }
  if (!isSupabaseConfigured()) {
    return { status: "error", message: "Online booking isn't open yet. Please try again soon.", values: raw };
  }

  const b = parsed.data;
  const cookieStore = await cookies();
  const { code } = resolveAttribution({
    urlCode: typeof raw.url_code === "string" ? raw.url_code : null,
    cookieValue: cookieStore.get(ATTRIBUTION_COOKIE)?.value,
    now: new Date(),
    windowDays: attributionWindowDays(),
  });
  const key = addressKey(b.address_line1, b.zip);
  const db = supabaseAdmin();

  // Same business already in the system: it stays with its first request (and first referrer).
  const lookups = await Promise.all(
    (["email", "address_key"] as const).map((column) =>
      db
        .from("referrals")
        .select("id, created_at")
        .eq(column, column === "email" ? b.email : key)
        .not("status", "in", "(rejected,expired,duplicate)")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ),
  );
  const lookupError = lookups.find((r) => r.error)?.error;
  if (lookupError) {
    console.error(`[book] duplicate lookup failed: ${lookupError.code}`);
    return { status: "error", message: "Something went wrong. Please try again.", values: raw };
  }
  const existing = lookups
    .map((r) => r.data as { id: string; created_at: string } | null)
    .filter((r): r is { id: string; created_at: string } => r !== null)
    .sort((x, y) => x.created_at.localeCompare(y.created_at))[0];

  const ip = clientIp((await headers()).get("x-forwarded-for"));
  const { error } = await db.from("referrals").insert({
    referral_code: code,
    source: code ? "link" : "direct",
    business_name: b.business_name,
    contact_name: b.contact_name,
    contact_title: b.contact_title,
    email: b.email,
    phone: b.phone,
    address_line1: b.address_line1,
    city: b.city,
    zip: b.zip,
    address_key: key,
    property_type: b.property_type,
    approx_sq_ft: b.approx_sq_ft,
    cleaning_frequency: b.cleaning_frequency,
    is_decision_maker: b.is_decision_maker === "yes",
    current_contract_end: b.current_contract_end,
    preferred_times: b.preferred_times,
    notes: b.notes,
    consent_at: new Date().toISOString(),
    consent_ip: ip,
    consent_text_version: BUSINESS_CONSENT_VERSION,
    status: existing ? "duplicate" : "waiting_for_match",
    duplicate_of: existing?.id ?? null,
  });
  if (error) {
    console.error(`[book] referral insert failed: ${error.code}`);
    return { status: "error", message: "Something went wrong saving your request. Please try again.", values: raw };
  }

  if (existing) {
    return {
      status: "success",
      message: "We already have a walkthrough request for this business. We'll follow up within one business day.",
    };
  }

  await sendEmail({
    to: b.email,
    subject: "We received your commercial cleaning walkthrough request",
    text:
      `Hi ${b.contact_name},\n\n` +
      "Thanks for requesting a commercial cleaning walkthrough through Something Clicks. We're matching your request " +
      "with one cleaning company that serves your area, and we'll follow up within one business day to schedule it.\n\n" +
      "Your details will only be shared with that one company.\n\n— Something Clicks",
  });
  await notifyAdmin(
    "Walkthrough request waiting for match",
    `A new walkthrough request (${b.city}, ${code ? "partner link" : "direct"}) is waiting for a match. ` +
      "Follow up within one business day. See Admin → Booking requests.",
  );

  return { status: "success", message: FOLLOW_UP };
}
