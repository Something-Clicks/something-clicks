import type { Attribution } from "./store/types";
import type { FormInput } from "./validation";

const clean = (value: unknown, max: number) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);

/** Attribution fields come from the browser, so they are length-capped and never trusted. */
export function readAttribution(input: FormInput): Attribution {
  const sourcePage = clean(input.source_page, 300);
  return {
    source_page: sourcePage.startsWith("/") ? sourcePage : "",
    referrer: clean(input.referrer, 500),
    utm_source: clean(input.utm_source, 200),
    utm_medium: clean(input.utm_medium, 200),
    utm_campaign: clean(input.utm_campaign, 200),
    utm_term: clean(input.utm_term, 200),
    utm_content: clean(input.utm_content, 200),
  };
}

/**
 * Visitor IP as reported by Vercel, which sets x-real-ip and overwrites
 * x-forwarded-for at its edge, so clients can't spoof them.
 */
export function clientIp(headers: Headers): string {
  return headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** One-way, salted hash so raw IP addresses are never stored. */
export async function hashIp(ip: string, salt = process.env.RATE_LIMIT_SALT ?? "something-clicks-dev-salt"): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
