"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/members/auth";
import { addPhoto, removePhoto, saveCoupleProfile, setVisibility } from "@/lib/couples/profile";
import { setInquiryStatus } from "@/lib/couples/inquiries";

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ").trim().slice(0, max);
const num = (f: FormData, k: string) => Number(f.get(k));

function back(path: string, placeId: number, extra: Record<string, string>, hash = ""): never {
  revalidatePath(path);
  redirect(`${path}?${new URLSearchParams({ place: String(placeId), ...extra })}${hash}`);
}

export async function saveCoupleProfileAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  const r = await saveCoupleProfile(member, placeId, {
    about: text(formData, "about", 1200),
    price_from: text(formData, "price_from", 12),
    price_to: text(formData, "price_to", 12),
    markets: formData.getAll("markets").map(String),
    styles: text(formData, "styles", 400),
  });
  back("/dashboard/profile", placeId, r.ok ? { done: "couples" } : { error: r.error }, "#couples");
}

export async function addPhotoAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  const file = formData.get("photo");
  const r = file instanceof File ? await addPhoto(member, placeId, file, text(formData, "alt", 200)) : { ok: false as const, error: "Choose a photo to upload." };
  back("/dashboard/profile", placeId, r.ok ? { done: "photo" } : { error: r.error }, "#photos");
}

export async function removePhotoAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  await removePhoto(member, placeId, num(formData, "photo_id"));
  back("/dashboard/profile", placeId, { done: "photo-removed" }, "#photos");
}

export async function visibilityAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  const on = formData.get("public_visible") === "on";
  const r = await setVisibility(member, placeId, on);
  back("/dashboard/profile", placeId, r.ok ? { done: on ? "public" : "hidden" } : { error: r.error }, "#visibility");
}

export async function inquiryStatusAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  const ok = await setInquiryStatus(member, placeId, num(formData, "inquiry_id"), text(formData, "status", 20));
  back("/dashboard/inquiries", placeId, ok ? { done: "status" } : { error: "Couldn't update that inquiry." });
}
