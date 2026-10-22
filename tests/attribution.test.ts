import { afterEach, describe, expect, it } from "vitest";
import {
  attributionWindowDays,
  codeFromSearchParams,
  decodeAttributionCookie,
  encodeAttributionCookie,
  normalizeReferralCode,
  resolveAttribution,
} from "@/lib/attribution";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-22T12:00:00Z");

describe("normalizeReferralCode", () => {
  it("lowercases and trims valid codes", () => {
    expect(normalizeReferralCode("  Jane-Smith_4K ")).toBe("jane-smith_4k");
  });
  it("rejects junk, injection attempts, and over-long codes", () => {
    for (const bad of ["", "a", "-start", "has space", "x;drop", "<script>", "a".repeat(41), null, undefined]) {
      expect(normalizeReferralCode(bad as string)).toBeNull();
    }
  });
});

describe("codeFromSearchParams", () => {
  afterEach(() => delete process.env.NEXT_PUBLIC_REFERRAL_PARAM_NAMES);

  it("reads ?via= and ?ref= by default", () => {
    expect(codeFromSearchParams(new URLSearchParams("via=abc"))).toBe("abc");
    expect(codeFromSearchParams({ ref: "xyz" })).toBe("xyz");
    expect(codeFromSearchParams({ ref: ["first", "second"] })).toBe("first");
    expect(codeFromSearchParams(new URLSearchParams("other=abc"))).toBeNull();
  });
  it("honours configured parameter names", () => {
    process.env.NEXT_PUBLIC_REFERRAL_PARAM_NAMES = "aff";
    expect(codeFromSearchParams(new URLSearchParams("via=abc&aff=partner1"))).toBe("partner1");
  });
});

describe("attribution cookie window", () => {
  it("round-trips within the window", () => {
    const value = encodeAttributionCookie("abc", new Date(now.getTime() - 10 * DAY));
    expect(decodeAttributionCookie(value, now, 90)?.code).toBe("abc");
  });
  it("expires after the window", () => {
    const value = encodeAttributionCookie("abc", new Date(now.getTime() - 91 * DAY));
    expect(decodeAttributionCookie(value, now, 90)).toBeNull();
  });
  it("rejects tampered or future-dated cookies", () => {
    expect(decodeAttributionCookie("abc", now, 90)).toBeNull();
    expect(decodeAttributionCookie("bad code.123", now, 90)).toBeNull();
    expect(decodeAttributionCookie(`abc.${now.getTime() + DAY}`, now, 90)).toBeNull();
  });
  it("defaults the window to 90 days and accepts overrides", () => {
    delete process.env.ATTRIBUTION_WINDOW_DAYS;
    expect(attributionWindowDays()).toBe(90);
    process.env.ATTRIBUTION_WINDOW_DAYS = "30";
    expect(attributionWindowDays()).toBe(30);
    process.env.ATTRIBUTION_WINDOW_DAYS = "nonsense";
    expect(attributionWindowDays()).toBe(90);
    delete process.env.ATTRIBUTION_WINDOW_DAYS;
  });
});

describe("resolveAttribution", () => {
  it("starts attribution from the URL when there is no cookie", () => {
    expect(resolveAttribution({ urlCode: "abc", cookieValue: undefined, now, windowDays: 90 })).toEqual({
      code: "abc",
      setCookie: `abc.${now.getTime()}`,
    });
  });
  it("keeps the first valid code over a later link", () => {
    const cookieValue = encodeAttributionCookie("first", new Date(now.getTime() - 5 * DAY));
    expect(resolveAttribution({ urlCode: "second", cookieValue, now, windowDays: 90 })).toEqual({
      code: "first",
      setCookie: null,
    });
  });
  it("lets a new link take over once the first has expired", () => {
    const cookieValue = encodeAttributionCookie("first", new Date(now.getTime() - 100 * DAY));
    expect(resolveAttribution({ urlCode: "second", cookieValue, now, windowDays: 90 }).code).toBe("second");
  });
  it("returns no attribution without a code", () => {
    expect(resolveAttribution({ urlCode: null, cookieValue: null, now, windowDays: 90 })).toEqual({
      code: null,
      setCookie: null,
    });
  });
});
