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
