import type { MetadataRoute } from "next";
import { categorySlug } from "@/content/journeys";
import { metros } from "@/content/metros";
import { site } from "@/content/site";
import { dbConfigured } from "@/lib/db";
import { allMetroCounts, categoryPageEligible, complementRules } from "@/lib/network/metros";

// City × category pages come from live counts; refresh with them.
export const revalidate = 3600;

const pages: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/weddings", priority: 0.8 },
  ...metros.map((m) => ({ path: `/weddings/${m.slug}`, priority: 0.8 })),
  { path: "/faq", priority: 0.7 },
  { path: "/pricing", priority: 0.6 },
  { path: "/referral-partners", priority: 0.6 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.5 },
  { path: "/data-sources", priority: 0.3 },
  { path: "/remove-my-business", priority: 0.3 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
];

/** Every city × category page with enough real data (the same rule the pages use). */
async function cityCategoryPages(): Promise<{ path: string; priority: number }[]> {
  if (!dbConfigured()) return [];
  try {
    const [counts, rules] = await Promise.all([allMetroCounts(), complementRules()]);
    return metros.flatMap((m) =>
      Object.keys(counts[m.cluster] ?? {})
        .filter((id) => categoryPageEligible(counts[m.cluster], rules, id))
        .map((id) => ({ path: `/weddings/${m.slug}/${categorySlug(id)}`, priority: 0.7 })),
    );
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url.replace(/\/$/, "");
  const all = [...pages, ...(await cityCategoryPages())];
  return all.map(({ path, priority }) => ({ url: `${base}${path === "/" ? "" : path}`, changeFrequency: "weekly", priority }));
}
