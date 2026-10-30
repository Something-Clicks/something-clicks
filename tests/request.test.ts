import { describe, expect, it } from "vitest";
import { clientIp, hashIp, readAttribution } from "@/lib/request";

describe("request helpers", () => {
  it("caps and cleans attribution fields from the browser", () => {
    const a = readAttribution({ source_page: "https://evil.example/", utm_source: "x".repeat(500) + "\u0000", referrer: "r" });
    expect(a.source_page).toBe("");
    expect(a.utm_source).toHaveLength(200);
    expect(a.referrer).toBe("r");
    expect(readAttribution({ source_page: "/join" }).source_page).toBe("/join");
  });

  it("reads the visitor IP from Vercel headers", () => {
    expect(clientIp(new Headers({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  it("hashes IPs deterministically without exposing them", async () => {
    const a = await hashIp("1.2.3.4", "salt");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(await hashIp("1.2.3.4", "salt"));
    expect(a).not.toBe(await hashIp("1.2.3.4", "other"));
  });
});
