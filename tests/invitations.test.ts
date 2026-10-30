import { describe, expect, it } from "vitest";
import {
  InvitationBlocked,
  clusterInvite,
  mailingAddress,
  memberInvite,
  readUnsubscribeToken,
  sendingBlockers,
  unsubscribeToken,
} from "@/lib/invitations";

const SECRET = "s".repeat(40);
const ADDRESS = "123 Main St, Suite 4, Dallas, TX 75201";

const base = async () => ({
  to: "hello@bluebonnet.example",
  siteUrl: "https://somethingclicks.com",
  unsubscribeToken: await unsubscribeToken("Hello@Bluebonnet.example", SECRET),
  address: ADDRESS,
});

describe("mailing address gate", () => {
  it("treats an unset address or the [ADDRESS] placeholder as missing", () => {
    expect(mailingAddress(undefined)).toBeNull();
    expect(mailingAddress("  ")).toBeNull();
    expect(mailingAddress("[ADDRESS]")).toBeNull();
    expect(mailingAddress(ADDRESS)).toBe(ADDRESS);
    expect(sendingBlockers({})).toHaveLength(2);
    expect(sendingBlockers({ MAILING_ADDRESS: ADDRESS, INVITE_EMAIL_FROM: "x@hello.somethingclicks.com" })).toEqual([]);
  });

  it("refuses to render for sending without an address, but allows a marked preview", async () => {
    const v = { ...(await base()), address: null, business: "Bluebonnet", count: 12, city: "Plano", examples: [], claimPath: "/claim/1" };
    expect(() => clusterInvite(v)).toThrow(InvitationBlocked);
    expect(clusterInvite({ ...v, preview: true }).text).toContain("[ADDRESS]");
  });
});

describe("unsubscribe tokens", () => {
  it("round-trip the normalized address and reject tampering", async () => {
    const t = await unsubscribeToken("Hello@Bluebonnet.example", SECRET);
    expect(await readUnsubscribeToken(t, SECRET)).toBe("hello@bluebonnet.example");
    const forged = `${btoa("someone@else.example").replace(/=+$/, "")}.${t.split(".")[1]}`;
    expect(await readUnsubscribeToken(forged, SECRET)).toBeNull();
    expect(await readUnsubscribeToken(t, "o".repeat(40))).toBeNull();
    expect(await readUnsubscribeToken("garbage", SECRET)).toBeNull();
  });
});

describe.each([
  ["cluster", async () => clusterInvite({ ...(await base()), business: "Bluebonnet Florals", count: 14, city: "Plano", examples: ["planners", "venues", "photographers"], claimPath: "/claim/9" })],
  ["member", async () => memberInvite({ ...(await base()), business: "Bluebonnet Florals", fromBusiness: "6 Carr Photography", fromCategory: "Photographer", fromCity: "Fort Worth", note: "Hi!", claimPath: "/claim/9" })],
])("%s invitation (CAN-SPAM and honesty)", (_name, render) => {
  it("names the sender, has the postal address and a working unsubscribe in both parts", async () => {
    const r = await render();
    for (const body of [r.text, r.html]) {
      expect(body).toContain("Something Clicks");
      expect(body).toContain(ADDRESS);
      expect(body).toMatch(/https:\/\/somethingclicks\.com\/unsubscribe\?t=/);
    }
    expect(r.headers["List-Unsubscribe"]).toMatch(/^<https:\/\/somethingclicks\.com\/api\/unsubscribe\?t=.+>$/);
    expect(r.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("never implies the recipient is a member or that anyone is waiting", async () => {
    const r = await render();
    const all = `${r.subject}\n${r.text}`;
    expect(all).not.toMatch(/waiting|member of|already joined|is on Something Clicks|you joined|^(re|fwd):/im);
    expect(all).toContain("Free to claim your business and see your matches.");
  });

  it("escapes business-supplied text in HTML", async () => {
    const r = memberInvite({ ...(await base()), business: "<b>X</b>", fromBusiness: "A&B", fromCategory: "Florist", fromCity: "Plano", note: "<script>", claimPath: "/claim/1" });
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("A&amp;B");
  });
});

describe("cluster invitation wording", () => {
  it("uses the live count with correct grammar and an accurate subject", async () => {
    const one = clusterInvite({ ...(await base()), business: "Solo Cakes", count: 1, city: "Frisco", examples: ["planners"], claimPath: "/claim/2" });
    expect(one.subject).toBe("1 wedding business near Frisco fits Solo Cakes");
    const many = clusterInvite({ ...(await base()), business: "Solo Cakes", count: 15, city: "Frisco", examples: ["planners", "venues", "florists"], claimPath: "/claim/2" });
    expect(many.subject).toBe("15 wedding businesses near Frisco fit Solo Cakes");
    expect(many.text).toContain("including planners, venues and florists");
    expect(many.text).toContain("This is the only email we'll send unless you claim your business.");
  });
});
