import { describe, expect, it } from "vitest";
import { emailMatchesWebsite, isFreeEmail, websiteDomain } from "@/lib/members/domains";
import { signMemberSession, verifyMemberSession } from "@/lib/members/session";
import { signSession, verifySession } from "@/lib/admin-session";

const SECRET = "x".repeat(40);

describe("websiteDomain", () => {
  it("normalizes a business website to its domain", () => {
    expect(websiteDomain("https://www.6carrphotography.com")).toBe("6carrphotography.com");
    expect(websiteDomain("SmithPhoto.com/about")).toBe("smithphoto.com");
    expect(websiteDomain("")).toBeNull();
  });
  it("ignores shared hosting and social sites", () => {
    expect(websiteDomain("https://smith.squarespace.com")).toBeNull();
    expect(websiteDomain("https://www.facebook.com/smithphoto")).toBeNull();
    expect(websiteDomain("https://www.theknot.com/marketplace/smith")).toBeNull();
  });
});

describe("emailMatchesWebsite", () => {
  it("accepts an address at the website's domain or a subdomain of it", () => {
    expect(emailMatchesWebsite("owner@6carrphotography.com", "https://www.6carrphotography.com")).toBe(true);
    expect(emailMatchesWebsite("Owner@SmithPhoto.com", "shop.smithphoto.com")).toBe(true);
    expect(emailMatchesWebsite("me@mail.smithphoto.com", "smithphoto.com")).toBe(true);
  });
  it("refuses other domains, free mail, and shared hosts", () => {
    expect(emailMatchesWebsite("owner@othersite.com", "smithphoto.com")).toBe(false);
    expect(emailMatchesWebsite("smithphoto@gmail.com", "smithphoto.com")).toBe(false);
    expect(emailMatchesWebsite("x@notsmithphoto.com", "smithphoto.com")).toBe(false);
    expect(emailMatchesWebsite("staff@squarespace.com", "smith.squarespace.com")).toBe(false);
    expect(emailMatchesWebsite("owner@gmail.com", "gmail.com")).toBe(false);
  });
  it("knows free mailboxes", () => {
    expect(isFreeEmail("a@gmail.com")).toBe(true);
    expect(isFreeEmail("a@smithphoto.com")).toBe(false);
  });
});

describe("member sessions", () => {
  it("round-trips and expires", async () => {
    const t = await signMemberSession({ id: 7, email: "A@B.com" }, SECRET, 0);
    expect(await verifyMemberSession(t, SECRET, 1000)).toEqual({ id: 7, email: "a@b.com" });
    expect(await verifyMemberSession(t, SECRET, 31 * 24 * 3600 * 1000)).toBeNull();
    expect(await verifyMemberSession(t, "y".repeat(40), 1000)).toBeNull();
    expect(await verifyMemberSession(t.slice(0, -2) + "xx", SECRET, 1000)).toBeNull();
  });
  it("can't stand in for an admin session, or the reverse", async () => {
    const member = await signMemberSession({ id: 1, email: "admin@x.com" }, SECRET);
    expect(await verifySession(member, SECRET, "admin@x.com")).toBeNull();
    const admin = await signSession("admin@x.com", SECRET);
    expect(await verifyMemberSession(admin, SECRET)).toBeNull();
  });
});

describe("claim links", () => {
  it("accept only listing UUIDs, never sequential ids", async () => {
    const { isListingRef } = await import("@/lib/members/claims");
    expect(isListingRef("3d3f1cab-62d2-48a4-9442-a81fcb0c9e56")).toBe(true);
    expect(isListingRef("3D3F1CAB-62D2-48A4-9442-A81FCB0C9E56")).toBe(true);
    for (const bad of ["1", "120633", "0", "-1", "1e5", "", "3d3f1cab62d248a49442a81fcb0c9e56", "../etc", "3d3f1cab-62d2-48a4-9442-a81fcb0c9e56x"]) {
      expect(isListingRef(bad), bad).toBe(false);
    }
  });

  it("claiming is closed unless CLAIMS_OPEN is exactly true", async () => {
    const { claimsOpen } = await import("@/lib/readiness");
    const before = process.env.CLAIMS_OPEN;
    for (const [v, open] of [[undefined, false], ["", false], ["1", false], ["TRUE", false], ["yes", false], ["true", true]] as const) {
      if (v === undefined) delete process.env.CLAIMS_OPEN; else process.env.CLAIMS_OPEN = v;
      expect(claimsOpen(), String(v)).toBe(open);
    }
    if (before === undefined) delete process.env.CLAIMS_OPEN; else process.env.CLAIMS_OPEN = before;
  });
});
