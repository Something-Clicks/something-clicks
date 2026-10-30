import type { MetadataRoute } from "next";
import { site } from "@/content/site";

const pages: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/claim", priority: 0.9 },
  { path: "/referral-partners", priority: 0.6 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.5 },
  { path: "/data-sources", priority: 0.3 },
  { path: "/remove-my-business", priority: 0.3 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  return pages.map(({ path, priority }) => ({ url: `${base}${path === "/" ? "" : path}`, changeFrequency: "monthly", priority }));
}
