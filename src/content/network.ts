/**
 * What the site and emails may call a business in each database state
 * (brief section 2). Never imply an imported business has joined.
 */
export const stateLabels = {
  listed: "Not on Something Clicks yet",
  claimed: "Claimed business",
  verified: "Verified business",
  member: "Network member",
} as const;

export type PlaceState = keyof typeof stateLabels;

/**
 * A live count rounded down to two significant digits, so it never overstates:
 * 242,325 -> "240,000+", 5,218 -> "5,200+", 87 -> "87".
 */
export function formatAtLeast(n: number): string {
  if (n < 100) return n.toLocaleString("en-US");
  const step = 10 ** (Math.floor(Math.log10(n)) - 1);
  const floored = Math.floor(n / step) * step;
  return floored === n ? n.toLocaleString("en-US") : `${floored.toLocaleString("en-US")}+`;
}

export const formatMiles = (meters: number) => {
  const mi = meters / 1609.344;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
};
