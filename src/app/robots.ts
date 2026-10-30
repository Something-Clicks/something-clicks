import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/join/thanks", "/contact/thanks", "/referral-partners/thanks"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
