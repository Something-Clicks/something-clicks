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

export const formatMiles = (meters: number) => {
  const mi = meters / 1609.344;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
};
