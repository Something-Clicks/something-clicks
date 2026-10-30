import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, signSession, verifySession } from "@/lib/admin-session";

const SECRET = "a".repeat(40);
const NOW = 1_800_000_000_000;

describe("admin session tokens", () => {
  it("round-trips for the configured admin", async () => {
    const token = await signSession("Matt@Example.com", SECRET, NOW);
    expect(await verifySession(token, SECRET, "matt@example.com", NOW)).toBe("matt@example.com");
  });

  it("rejects a different admin email", async () => {
    const token = await signSession("someone@example.com", SECRET, NOW);
    expect(await verifySession(token, SECRET, "matt@example.com", NOW)).toBeNull();
  });

  it("rejects tokens signed with another secret", async () => {
    const token = await signSession("matt@example.com", "b".repeat(40), NOW);
    expect(await verifySession(token, SECRET, "matt@example.com", NOW)).toBeNull();
  });

  it("rejects tampered payloads", async () => {
    const token = await signSession("matt@example.com", SECRET, NOW);
    const [, sig] = token.split(".");
    const forged = btoa(JSON.stringify({ email: "matt@example.com", exp: 9_999_999_999 })).replace(/=+$/, "");
    expect(await verifySession(`${forged}.${sig}`, SECRET, "matt@example.com", NOW)).toBeNull();
  });

  it("expires after the session lifetime", async () => {
    const token = await signSession("matt@example.com", SECRET, NOW);
    const later = NOW + (SESSION_TTL_SECONDS + 1) * 1000;
    expect(await verifySession(token, SECRET, "matt@example.com", later)).toBeNull();
  });

  it("handles missing and malformed tokens", async () => {
    expect(await verifySession(undefined, SECRET, "matt@example.com")).toBeNull();
    expect(await verifySession("garbage", SECRET, "matt@example.com")).toBeNull();
    expect(await verifySession("a.b", SECRET, "matt@example.com")).toBeNull();
  });
});
