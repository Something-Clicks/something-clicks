/** Launch metros with a public city page. `cluster` is the clusters.slug the counts come from. */
export const metros = [
  { slug: "dallas-fort-worth", name: "Dallas–Fort Worth", short: "DFW", cluster: "dfw-weddings", where: "Dallas, TX", state: "Texas" },
  { slug: "atlanta", name: "Atlanta", short: "Atlanta", cluster: "atl-weddings", where: "Atlanta, GA", state: "Georgia" },
  { slug: "houston", name: "Houston", short: "Houston", cluster: "hou-weddings", where: "Houston, TX", state: "Texas" },
  { slug: "phoenix", name: "Phoenix", short: "Phoenix", cluster: "phx-weddings", where: "Phoenix, AZ", state: "Arizona" },
  { slug: "nashville", name: "Nashville", short: "Nashville", cluster: "bna-weddings", where: "Nashville, TN", state: "Tennessee" },
] as const;

export type Metro = (typeof metros)[number];

export const metroBySlug = (slug: string): Metro | undefined => metros.find((m) => m.slug === slug);
