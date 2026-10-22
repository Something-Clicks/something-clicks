"use server";

import { redirect } from "next/navigation";
import { requireBuyerUser } from "@/lib/auth";
import { loadBuyerProfile } from "@/lib/buyers";
import { BUYER_TERMS_VERSION } from "@/lib/constants";
import { notifyAdmin } from "@/lib/email";
import type { FormState } from "@/lib/forms";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buyerOnboardingSchema, fieldErrors, formToObject } from "@/lib/validation";

export async function saveBuyerProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireBuyerUser();
  const raw = formToObject(form, ["service_areas", "property_types", "cleaning_frequencies", "availability_days"]);
  const parsed = buyerOnboardingSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values: raw };
  }
  const v = parsed.data;
  const existing = await loadBuyerProfile({ userId: user.id });
  if (!existing && v.agree_terms !== "on") {
    return { status: "error", fieldErrors: { agree_terms: "You must agree to the buyer terms" }, values: raw };
  }

  const db = supabaseAdmin();
  const fields = {
    company_name: v.company_name,
    contact_name: v.contact_name,
    email: user.email,
    phone: v.phone,
    website: v.website,
    updated_at: new Date().toISOString(),
  };
  const { data: buyer, error } = existing
    ? await db.from("buyers").update(fields).eq("id", existing.id).select("id").single()
    : await db
        .from("buyers")
        .insert({
          ...fields,
          user_id: user.id,
          terms_version: BUYER_TERMS_VERSION,
          terms_agreed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
  if (error || !buyer) {
    console.error(`[onboarding] buyer upsert failed: ${error?.code}`);
    return { status: "error", message: "Couldn't save your company. Please try again.", values: raw };
  }

  const steps = [
    db.from("buyer_service_areas").delete().eq("buyer_id", buyer.id),
    db.from("buyer_availability").delete().eq("buyer_id", buyer.id),
  ];
  for (const step of await Promise.all(steps)) if (step.error) return saveFailed(raw, step.error.code);

  const writes = await Promise.all([
    db.from("buyer_service_areas").insert(v.service_areas.map((area) => ({ buyer_id: buyer.id, area }))),
    db.from("buyer_availability").insert(
      [...new Set(v.availability_days)].map((day) => ({
        buyer_id: buyer.id,
        day_of_week: day,
        start_time: v.availability_start,
        end_time: v.availability_end,
      })),
    ),
    db.from("buyer_criteria").upsert({
      buyer_id: buyer.id,
      min_sq_ft: v.min_sq_ft,
      property_types: v.property_types,
      cleaning_frequencies: v.cleaning_frequencies,
      notes: v.notes,
      updated_at: new Date().toISOString(),
    }),
  ]);
  for (const w of writes) if (w.error) return saveFailed(raw, w.error.code);

  if (!existing) {
    await notifyAdmin("New cleaning company signup", "A new cleaning company is waiting for approval. Review it under Admin → Buyers.");
  }
  redirect("/dashboard?saved=1");
}

function saveFailed(values: Record<string, unknown>, code: string | undefined): FormState {
  console.error(`[onboarding] profile write failed: ${code}`);
  return { status: "error", message: "Couldn't save everything. Please try again.", values };
}
