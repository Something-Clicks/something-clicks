"use server";

import { redirect } from "next/navigation";
import { requireMember } from "@/lib/members/auth";
import { ownedPlaces } from "@/lib/members/network";
import { portalUrl, startCheckout } from "@/lib/payments/billing";
import { isPlanKind } from "@/lib/payments/plans";

function back(placeId: number, error: string): never {
  redirect(`/dashboard/plans?${new URLSearchParams({ place: String(placeId), error })}`);
}

/** Sends the verified owner to Stripe's hosted Checkout. Card details never reach this site. */
export async function checkoutAction(formData: FormData) {
  const member = await requireMember("/dashboard/plans");
  const placeId = Number(formData.get("place_id"));
  const kind = formData.get("kind");
  const place = (await ownedPlaces(member.id)).find((p) => p.id === placeId);
  if (!place || !isPlanKind(kind)) redirect("/dashboard/plans");
  const res = await startCheckout(kind, place, member);
  if (!res.ok) return back(placeId, res.error);
  redirect(res.url);
}

/** Stripe's Customer Portal: cancel, update the card, download invoices. */
export async function portalAction(formData: FormData) {
  const member = await requireMember("/dashboard/plans");
  const placeId = Number(formData.get("place_id"));
  const place = (await ownedPlaces(member.id)).find((p) => p.id === placeId);
  if (!place) redirect("/dashboard/plans");
  const url = await portalUrl(place.id);
  if (!url) return back(placeId, "There's no billing account for this business yet.");
  redirect(url);
}
