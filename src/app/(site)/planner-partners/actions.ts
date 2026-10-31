"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireMember } from "@/lib/members/auth";
import { ownedPlaces } from "@/lib/members/network";
import { acceptFromDashboard, addInvites, apply, MAX_INVITES, type InviteInput } from "@/lib/planner/partners";
import { clientIp } from "@/lib/request";
import { validEmail } from "@/lib/members/limits";

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

async function owned(next: string, f: FormData) {
  const member = await requireMember(next);
  const place = (await ownedPlaces(member.id)).find((p) => p.id === Number(f.get("place_id")));
  if (!place) redirect(next);
  return { member, place };
}

/** Planner Partner application. The agreement box must be ticked; acceptance is recorded with the IP. */
export async function applyAction(f: FormData) {
  const { member, place } = await owned("/planner-partners", f);
  const res = await apply(member, place, text(f, "message", 1000), f.get("agree") === "on", clientIp(await headers()));
  redirect(`/planner-partners?${new URLSearchParams(res.ok ? { done: "applied" } : { error: res.error })}#apply`);
}

/** A partner made by an admin accepts the agreement from their dashboard (or accepts a new version). */
export async function acceptAgreementAction(f: FormData) {
  const { member, place } = await owned("/dashboard/vendors", f);
  const res = await acceptFromDashboard(member, place, f.get("agree") === "on", clientIp(await headers()));
  redirect(`/dashboard/vendors?${new URLSearchParams({ place: String(place.id), ...(res.ok ? { done: "accepted" } : { error: res.error }) })}`);
}

/** "Invite your vendors": each row goes to the admin queue. Nothing is emailed until an admin approves. */
export async function inviteVendorsAction(f: FormData) {
  const { place } = await owned("/dashboard/vendors", f);
  const rows: InviteInput[] = [];
  for (let i = 0; i < MAX_INVITES; i++) {
    const name = text(f, `name_${i}`, 120);
    const email = text(f, `email_${i}`, 254).toLowerCase();
    if (!name && !email) continue;
    if (name.length < 2 || !validEmail(email)) {
      redirect(`/dashboard/vendors?${new URLSearchParams({ place: String(place.id), error: `Row ${i + 1}: add the business name and a valid contact email.` })}`);
    }
    rows.push({ name, contact_email: email, category_id: text(f, `category_${i}`, 60), city: text(f, `city_${i}`, 120), note: text(f, `note_${i}`, 500) });
  }
  const res = await addInvites(place.id, rows);
  redirect(`/dashboard/vendors?${new URLSearchParams({ place: String(place.id), ...(res.error ? { error: res.error } : {}), done: `invited-${res.added}` })}`);
}
