"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditLog, requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { testPromoteKitConnection, type PromoteKitConnectionResult } from "@/lib/promotekit";
import { adjustmentSchema, creditPackSchema, formToObject, settingsSchema } from "@/lib/validation";

const BUYER_TRANSITIONS: Record<string, string[]> = {
  approve: ["pending", "rejected", "suspended"],
  reject: ["pending"],
  suspend: ["approved"],
};

export async function setBuyerStatus(form: FormData) {
  const admin = await requireAdmin();
  const buyerId = String(form.get("buyer_id"));
  const action = String(form.get("action"));
  const next = { approve: "approved", reject: "rejected", suspend: "suspended" }[action];
  if (!next) throw new Error("unknown action");

  const db = supabaseAdmin();
  const { data: buyer, error } = await db
    .from("buyers")
    .update({
      status: next,
      updated_at: new Date().toISOString(),
      ...(next === "approved" ? { approved_at: new Date().toISOString(), approved_by: admin.id } : {}),
    })
    .eq("id", buyerId)
    .in("status", BUYER_TRANSITIONS[action])
    .select("id, email, contact_name")
    .maybeSingle();
  if (error) throw new Error(`buyer status update failed: ${error.message}`);

  if (buyer) {
    await auditLog({ actorId: admin.id, action: `buyer.${action}`, entityType: "buyer", entityId: buyerId });
    if (next === "approved") {
      await sendEmail({
        to: buyer.email,
        subject: "Your Something Clicks account is approved",
        text:
          `Hi ${buyer.contact_name},\n\nYour company is approved. Next step: buy the pilot from your dashboard: ` +
          `${siteUrl()}/dashboard\n\n— Something Clicks`,
      });
    }
  }
  revalidatePath(`/admin/buyers/${buyerId}`);
  revalidatePath("/admin/buyers");
}

export async function adjustCredits(form: FormData) {
  const admin = await requireAdmin();
  const buyerId = String(form.get("buyer_id"));
  const parsed = adjustmentSchema.safeParse(formToObject(form));
  if (!parsed.success) redirect(`/admin/buyers/${buyerId}?error=adjustment`);

  const { error } = await supabaseAdmin().from("credit_ledger").insert({
    buyer_id: buyerId,
    entry_type: "adjustment",
    delta: parsed.data.delta,
    note: parsed.data.note,
    actor: admin.id,
  });
  if (error) throw new Error(`adjustment failed: ${error.message}`);
  await auditLog({
    actorId: admin.id,
    action: "credits.adjust",
    entityType: "buyer",
    entityId: buyerId,
    details: { delta: parsed.data.delta, note: parsed.data.note },
  });
  revalidatePath(`/admin/buyers/${buyerId}`);
}

export async function createPack(form: FormData) {
  const admin = await requireAdmin();
  const parsed = creditPackSchema.safeParse(formToObject(form));
  if (!parsed.success) redirect("/admin/packs?error=invalid");
  const { data, error } = await supabaseAdmin()
    .from("credit_packs")
    .insert({
      name: parsed.data.name,
      credits: parsed.data.credits,
      price_cents: Math.round(parsed.data.price_dollars * 100),
    })
    .select("id")
    .single();
  if (error) throw new Error(`pack create failed: ${error.message}`);
  await auditLog({ actorId: admin.id, action: "pack.create", entityType: "credit_pack", entityId: data.id, details: parsed.data });
  revalidatePath("/admin/packs");
}

export async function togglePack(form: FormData) {
  const admin = await requireAdmin();
  const packId = String(form.get("pack_id"));
  const active = form.get("active") === "true";
  const { error } = await supabaseAdmin().from("credit_packs").update({ active }).eq("id", packId);
  if (error) throw new Error(`pack update failed: ${error.message}`);
  await auditLog({ actorId: admin.id, action: active ? "pack.activate" : "pack.deactivate", entityType: "credit_pack", entityId: packId });
  revalidatePath("/admin/packs");
}

export async function rejectApplication(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("application_id"));
  const note = String(form.get("note") ?? "").trim() || null;
  const { data, error } = await supabaseAdmin()
    .from("partner_applications")
    .update({ status: "rejected", review_note: note, reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`application update failed: ${error.message}`);
  if (data) await auditLog({ actorId: admin.id, action: "partner_application.reject", entityType: "partner_application", entityId: id, details: { note } });
  revalidatePath("/admin/applications");
}

export async function saveSettings(form: FormData) {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse(formToObject(form));
  if (!parsed.success) redirect("/admin/settings?error=invalid");
  const s = parsed.data;
  const values = {
    price_per_appointment_cents: s.price_per_appointment === null ? null : Math.round(s.price_per_appointment * 100),
    commission_amount_cents: s.commission_amount === null ? null : Math.round(s.commission_amount * 100),
    dispute_window_hours: s.dispute_window_hours,
    referral_expiry_days: s.referral_expiry_days,
  };
  const { error } = await supabaseAdmin()
    .from("settings")
    .update({ ...values, updated_at: new Date().toISOString(), updated_by: admin.id })
    .eq("id", true);
  if (error) throw new Error(`settings update failed: ${error.message}`);
  await auditLog({ actorId: admin.id, action: "settings.update", entityType: "settings", details: values });
  redirect("/admin/settings?saved=1");
}

/** Admin-only: one read-only PromoteKit request (list affiliates) to check the key and plan. */
export async function checkPromoteKitConnection(): Promise<PromoteKitConnectionResult> {
  await requireAdmin();
  return testPromoteKitConnection();
}
