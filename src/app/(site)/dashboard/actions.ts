"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { partnershipLabels, type PartnershipType } from "@/content/journeys";
import { site } from "@/content/site";
import { sendEmail, simpleEmail } from "@/lib/mailer";
import { requireMember } from "@/lib/members/auth";
import { validEmail } from "@/lib/members/limits";
import {
  acceptPartnership,
  endPartnership,
  proposePartnership,
  requestIntroduction,
  respondIntroduction,
  saveProfile,
  validLink,
} from "@/lib/members/network";

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
const num = (f: FormData, k: string) => Number(f.get(k));

function back(path: string, placeId: number, extra: Record<string, string>): never {
  revalidatePath(path);
  redirect(`${path}?${new URLSearchParams({ place: String(placeId), ...extra })}`);
}

/** Notices about introductions are best-effort: the dashboard is the record. */
async function notify(to: string, subject: string, heading: string, lines: string[], path: string) {
  await sendEmail({
    to,
    subject,
    ...simpleEmail({
      heading,
      lines,
      button: { label: "Open your dashboard", url: `${site.url}${path}` },
      footer: "You're getting this because you claimed your business on Something Clicks.",
    }),
  }).catch((e) => console.error("[dashboard] notice failed", e));
}

export async function requestIntroAction(formData: FormData) {
  const member = await requireMember();
  const from = num(formData, "place_id");
  const to = num(formData, "to_place");
  const r = await requestIntroduction(member, from, to, text(formData, "note", 200));
  if (r.status === "error") back("/dashboard", from, { error: r.error });
  if (r.status === "requested") {
    await notify(
      r.toEmail,
      `${r.fromName} would like an introduction`,
      `${r.fromName} would like to connect.`,
      [
        `${r.fromName} saw ${r.toName} in their Something Clicks matches and asked for an introduction.`,
        "If you accept, you'll both see each other's contact details. If not, nothing is shared.",
      ],
      "/dashboard/requests",
    );
  }
  back("/dashboard", from, { done: r.status === "connected" ? "connected" : "requested" });
}

export async function respondIntroAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  const accept = formData.get("decision") === "accept";
  const r = await respondIntroduction(member, num(formData, "intro_id"), accept);
  if (r.ok && r.accepted) {
    await notify(
      r.requesterEmail,
      `${r.responderName} accepted your introduction`,
      "You're connected.",
      [`${r.responderName} accepted. Their contact details are on your dashboard now.`],
      "/dashboard/requests",
    );
  }
  back("/dashboard/requests", placeId, r.ok ? { done: accept ? "accepted" : "declined" } : { error: "That request is no longer open." });
}

const TYPES = Object.keys(partnershipLabels) as PartnershipType[];

export async function proposeAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  const type = text(formData, "type", 20) as PartnershipType;
  const offer = text(formData, "offer", 300);
  const link = text(formData, "link", 500);
  if (!TYPES.includes(type) || !offer) back("/dashboard/partnerships", placeId, { error: "Choose a type and describe the offer." });
  if (!validLink(link)) back("/dashboard/partnerships", placeId, { error: "Links start with https://" });
  const ok = await proposePartnership(member, placeId, num(formData, "intro_id"), { type, offer, code: text(formData, "code", 40), link });
  back("/dashboard/partnerships", placeId, ok ? { done: "proposed" } : { error: "You can set up a partnership after you're connected." });
}

export async function acceptPartnershipAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  const ok = await acceptPartnership(member, placeId, num(formData, "partnership_id"));
  back("/dashboard/partnerships", placeId, ok ? { done: "live" } : { error: "That proposal is no longer open." });
}

export async function endPartnershipAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  await endPartnership(member, placeId, num(formData, "partnership_id"));
  back("/dashboard/partnerships", placeId, { done: "ended" });
}

export async function saveProfileAction(formData: FormData) {
  const member = await requireMember();
  const placeId = num(formData, "place_id");
  const contactEmail = text(formData, "contact_email", 254).toLowerCase();
  if (!validEmail(contactEmail)) back("/dashboard/profile", placeId, { error: "Enter a valid contact email." });
  const ok = await saveProfile(member, placeId, {
    description: text(formData, "description", 500),
    service_area: text(formData, "service_area", 200),
    contact_name: text(formData, "contact_name", 120),
    contact_email: contactEmail,
    contact_phone: text(formData, "contact_phone", 40),
    network_opt_in: formData.get("network_opt_in") === "on",
  });
  back(ok && formData.get("network_opt_in") === "on" && formData.get("welcome") ? "/dashboard" : "/dashboard/profile", placeId, ok ? { done: "saved" } : { error: "Couldn't save." });
}
