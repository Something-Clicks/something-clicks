"use server";

import { redirect } from "next/navigation";
import { allow, validEmail } from "@/lib/members/limits";
import { requestRemoval } from "@/lib/network/removals";

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

export async function removeBusiness(formData: FormData) {
  const placeId = Number(formData.get("place_id")) || null;
  const input = {
    place_id: placeId,
    business_name: text(formData, "business_name", 200),
    city: text(formData, "city", 120),
    contact_email: text(formData, "contact_email", 254).toLowerCase(),
    website: text(formData, "website", 300),
    notes: text(formData, "notes", 1000),
  };
  const back = (error: string): never =>
    redirect(`/remove-my-business?${new URLSearchParams({ error, ...(placeId ? { place: String(placeId) } : {}) })}`);
  if (input.business_name.length < 2) return back("name");
  if (!validEmail(input.contact_email)) return back("email");
  if (!(await allow("removal", 3600, 5))) return back("limit");
  const { hidden } = await requestRemoval(input);
  redirect(`/remove-my-business/thanks${hidden ? "?hidden=1" : ""}`);
}
