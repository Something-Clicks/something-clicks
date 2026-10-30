import { requireMember } from "./auth";
import { incomingCount, ownedPlaces, pendingClaims, type OwnedPlace, type PendingClaim } from "./network";
import type { MemberSession } from "./session";

export type DashboardContext =
  | { kind: "place"; member: MemberSession; place: OwnedPlace; places: OwnedPlace[]; incoming: number }
  | { kind: "none"; member: MemberSession; pending: PendingClaim[] };

/** Loads the signed-in member and the business they're looking at (?place=, else their first). */
export async function loadDashboard(path: string, placeParam?: string): Promise<DashboardContext> {
  const member = await requireMember(path);
  const places = await ownedPlaces(member.id);
  if (!places.length) return { kind: "none", member, pending: await pendingClaims(member) };
  const place = places.find((p) => p.id === Number(placeParam)) ?? places[0];
  return { kind: "place", member, place, places, incoming: await incomingCount(place.id) };
}
