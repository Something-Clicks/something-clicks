import type { MetadataRoute } from "next";
import { site } from "@/content/site";

/** Private, personal or one-off pages: never crawled, by anyone. */
const disallow = [
  "/admin", "/api/", "/dashboard", "/claim", "/sign-in", "/auth/", "/r/", "/matches", "/unsubscribe",
  "/contact/thanks", "/referral-partners/thanks", "/remove-my-business/thanks",
];

/** Search and AI crawlers named explicitly, so the policy is clear to each of them. */
const crawlers = ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended"];

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: [
      { userAgent: crawlers, allow: "/", disallow },
      { userAgent: "*", allow: "/", disallow },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
