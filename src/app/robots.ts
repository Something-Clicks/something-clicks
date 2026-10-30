import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/dashboard", "/sign-in", "/auth/", "/r/", "/claim/", "/matches", "/contact/thanks", "/referral-partners/thanks", "/remove-my-business/thanks"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
