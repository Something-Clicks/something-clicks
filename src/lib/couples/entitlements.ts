import { sql } from "@/lib/db";

/**
 * What a business can use. One monthly membership includes the core
 * features; premium campaigns and extra reach are separate add-ons, granted
 * by rows in `entitlements` (no billing for them yet).
 *
 * Nothing is enforced until MEMBERSHIP_GATING is exactly "true": until then
 * every verified business has the core features. Entitlements never affect
 * matching, ranking or the order couples see vendors in.
 */
export const CORE_FEATURES = ["partnerships", "public_profile", "inquiries", "joint_promotions", "results"] as const;
export const ADDON_FEATURES = ["premium_campaigns", "extra_reach"] as const;
export type Feature = (typeof CORE_FEATURES)[number] | (typeof ADDON_FEATURES)[number];

export const gatingOn = () => process.env.MEMBERSHIP_GATING === "true";

/** The features this business has right now. `member` is whether its membership (paid or complimentary) is live. */
export async function featuresFor(placeId: number, member: boolean): Promise<Set<Feature>> {
  const out = new Set<Feature>(!gatingOn() || member ? CORE_FEATURES : []);
  try {
    const rows = await sql()<{ feature: Feature }[]>`
      select distinct feature from entitlements
      where place_id = ${placeId} and starts_on <= current_date and (ends_on is null or ends_on >= current_date)`;
    for (const r of rows) out.add(r.feature);
  } catch {
    // the couples migration isn't applied yet
  }
  return out;
}
