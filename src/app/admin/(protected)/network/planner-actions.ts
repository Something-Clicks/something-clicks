"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { approveInvite, endPartner, markPartner, rejectApplication, setInviteStatus } from "@/lib/planner/partners";

const PARTNERS = "/admin/network/planner-partners";
const INVITES = "/admin/network/vendor-invites";

function back(path: string, params: Record<string, string>): never {
  revalidatePath(path);
  redirect(`${path}?${new URLSearchParams(params)}`);
}

export async function markPartnerAction(f: FormData) {
  await requireAdmin();
  const res = await markPartner(Number(f.get("place_id")), String(f.get("starts_on") ?? "") || undefined, String(f.get("ends_on") ?? "") || undefined);
  back(PARTNERS, res.ok ? { done: "Planner Partner saved." } : { error: res.error });
}

export async function endPartnerAction(f: FormData) {
  await requireAdmin();
  await endPartner(Number(f.get("place_id")));
  back(PARTNERS, { done: "Planner Partner ended." });
}

export async function rejectApplicationAction(f: FormData) {
  await requireAdmin();
  await rejectApplication(Number(f.get("id")));
  back(PARTNERS, { done: "Application declined." });
}

export async function approveInviteAction(f: FormData) {
  await requireAdmin();
  const res = await approveInvite(Number(f.get("id")));
  back(INVITES, res.ok ? { done: "Invitation sent." } : { error: res.error });
}

export async function inviteStatusAction(f: FormData) {
  await requireAdmin();
  const status = String(f.get("status"));
  if (status !== "declined" && status !== "claimed") throw new Error("Unknown status");
  await setInviteStatus(Number(f.get("id")), status, Number(f.get("claimed_place_id")) || undefined);
  back(INVITES, { done: "Saved." });
}
