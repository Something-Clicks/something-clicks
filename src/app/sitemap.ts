import type { MetadataRoute } from "next";
import { site } from "@/content/site";

const pages: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/how-it-works", priority: 0.8 },
  { path: "/for-businesses", priority: 0.9 },
  { path: "/referral-partners", priority: 0.7 },
  { path: "/join", priority: 0.9 },
  { path: "/about", priority: 0.6 },
  { path: "/contact", priority: 0.6 },
  { path: "/privacy", priority: 0.2 },
  { path: "/terms", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = site.url.replace(/\/$/, "");
  return pages.map(({ path, priority }) => ({ url: `${base}${path === "/" ? "" : path}`, changeFrequency: "monthly", priority }));
}
