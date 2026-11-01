/**
 * Couples against a real database: the couple-facing profile, the visibility
 * toggle, what couples can see, inquiry sources, spam protection, and that
 * only the contacted vendor sees an inquiry. Needs TEST_DATABASE_URL.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { parseStyles } from "@/lib/couples/profile";
import { priceText } from "@/lib/couples/config";

describe("couples rules that need no database", () => {
  it("keeps couples, inquiries and payment out of matching, and payment out of the directory order", () => {
    const dir = join(__dirname, "..", "supabase", "migrations");
    const matching = readdirSync(dir)
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .flatMap((s) => s.split(/create or replace function/i).filter((x) => /^\s*(compute_matches|needs_confirmation)/i.test(x)));
    const code = ["src/lib/network/search.ts", "src/lib/members/network.ts"].map((f) => readFileSync(join(__dirname, "..", f), "utf8"));
    for (const text of [...matching, ...code]) expect(text).not.toMatch(/inquiries|profile_views|entitlements|public_visible|portfolio_photos/);
    const directory = readFileSync(join(__dirname, "..", "src/lib/couples/directory.ts"), "utf8");
    expect(directory).not.toMatch(/purchases|memberships|campaigns|entitlements|stripe_/);
  });

  it("cleans styles and formats prices", () => {
    expect(parseStyles(" boho, Boho ,classic,,  black   and white ")).toEqual(["Boho", "Classic", "Black and white"]);
    expect(parseStyles(Array.from({ length: 12 }, (_, i) => `s${i}`).join(","))).toHaveLength(8);
    expect(priceText(2500, 6000)).toBe("$2,500–$6,000");
    expect(priceText(2500, null)).toBe("From $2,500");
    expect(priceText(null, null)).toBe("");
  });
});

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;
if (URL) process.env.SUPABASE_DB_URL = URL;

d("Couples", async () => {
  const profile = await import("@/lib/couples/profile");
  const dir = await import("@/lib/couples/directory");
  const inq = await import("@/lib/couples/inquiries");
  const db = URL ? postgres(URL, { max: 1 }) : (null as unknown as postgres.Sql);
  const ids: Record<string, number> = {};
  const members: Record<string, { id: number; email: string }> = {};
  const sent: { to: string; subject: string }[] = [];
  const notify = async (m: { to: string; subject: string }) => { sent.push({ to: m.to, subject: m.subject }); };
  const jpeg = () => new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3])], "a.jpg", { type: "image/jpeg" });
  const asMember = (k: string) => members[k] as Parameters<typeof profile.setVisibility>[0];

  const place = async (key: string, category: string, state: string, owner?: string) => {
    const [p] = await db<{ id: number }[]>`
      insert into places (source, name, category_id, geog, state, locality, region)
      values ('member', ${"Couples test " + key}, ${category}, st_setsrid(st_makepoint(-150, 10), 4326)::geography, ${state}, 'Testville', 'TX')
      returning id::int`;
    ids[key] = p.id;
    if (owner) {
      const m = members[owner];
      await db`insert into place_claims (place_id, email, member_id, method, status) values (${p.id}, ${m.email}, ${m.id}, 'email_domain', 'approved')`;
      await db`insert into profiles (place_id, member_id, contact_email) values (${p.id}, ${m.id}, ${m.email})`;
    }
  };

  beforeAll(async () => {
    for (const k of ["photo", "florist", "planner", "hidden"]) {
      const [m] = await db<{ id: number }[]>`insert into members (email) values (${`${k}@sc-couples.example`}) returning id::int`;
      members[k] = { id: m.id, email: `${k}@sc-couples.example` };
    }
    await place("photo", "photographers", "verified", "photo");
    await place("florist", "florists", "verified", "florist");
    await place("planner", "wedding_planners", "verified", "planner");
    await place("hidden", "florists", "verified", "hidden");
    await place("unclaimed", "photographers", "listed");
    profile.setPhotoStoreForTests({ put: async (path) => `https://cdn.test/${path}`, remove: async () => {} });
    // Two live partnerships for the photographer: the florist (public) and the hidden florist (never shown).
    for (const other of ["florist", "hidden"]) {
      const [i] = await db<{ id: number }[]>`
        insert into introductions (from_place, to_place, requested_by, status) values (${ids.photo}, ${ids[other]}, ${members.photo.id}, 'connected') returning id::int`;
      await db`insert into partnerships (introduction_id, proposed_by, type, offer, stage) values (${i.id}, ${ids.photo}, 'referral', 'Swap couples', 'live')`;
    }
  });

  afterAll(async () => {
    profile.setPhotoStoreForTests(null);
    delete process.env.COUPLES_OPEN;
    await db`delete from places where id in ${db(Object.values(ids))}`;
    await db`delete from members where email like '%@sc-couples.example'`;
    await db.end();
  });

  it("saves the couple-facing fields, scoped to the owner", async () => {
    expect(await profile.saveCoupleProfile(asMember("photo"), ids.photo, { about: "Documentary photos.", price_from: "$2,500", price_to: "6000", markets: ["dallas-fort-worth", "nowhere"], styles: "Classic, candid" })).toEqual({ ok: true });
    expect(await profile.saveCoupleProfile(asMember("photo"), ids.photo, { about: "", price_from: "500", price_to: "100", markets: [], styles: "" })).toMatchObject({ ok: false });
    expect(await profile.saveCoupleProfile(asMember("florist"), ids.photo, { about: "hijack", price_from: "", price_to: "", markets: [], styles: "" })).toMatchObject({ ok: false });
    const p = await profile.coupleProfile(ids.photo);
    expect(p).toMatchObject({ about: "Documentary photos.", price_from: 2500, price_to: 6000, markets: ["dallas-fort-worth"], styles: ["Classic", "Candid"], public_visible: false });
  });

  it("stays off by default and turns on only when complete", async () => {
    expect(await profile.setVisibility(asMember("photo"), ids.photo, true)).toMatchObject({ ok: false }); // no photo yet
    expect(await profile.addPhoto(asMember("photo"), ids.photo, new File(["not an image"], "x.jpg", { type: "image/jpeg" }), "")).toMatchObject({ ok: false });
    expect(await profile.addPhoto(asMember("photo"), ids.photo, jpeg(), "At the altar")).toEqual({ ok: true });
    const on = await profile.setVisibility(asMember("photo"), ids.photo, true);
    expect(on).toMatchObject({ ok: true, slug: "couples-test-photo-testville" });
    // The florist goes public too; the hidden florist completes its profile but never opts in.
    for (const k of ["florist", "hidden"]) {
      await profile.saveCoupleProfile(asMember(k), ids[k], { about: "Flowers.", price_from: "800", price_to: "", markets: ["dallas-fort-worth"], styles: "" });
      await profile.addPhoto(asMember(k), ids[k], jpeg(), "");
    }
    expect(await profile.setVisibility(asMember("florist"), ids.florist, true)).toMatchObject({ ok: true });
  });

  it("shows couples only verified vendors who opted in, partners included", async () => {
    const all = await dir.browseVendors({ market: "dallas-fort-worth" });
    const names = all.map((v) => v.name);
    expect(names).toEqual(expect.arrayContaining(["Couples test photo", "Couples test florist"]));
    expect(names).not.toContain("Couples test hidden");
    expect(names).not.toContain("Couples test unclaimed");
    expect((await dir.browseVendors({ market: "dallas-fort-worth", category: "florists" })).every((v) => v.category_id === "florists")).toBe(true);
    expect((await dir.browseVendors({ market: "dallas-fort-worth", budgetMax: 1000 })).map((v) => v.name)).not.toContain("Couples test photo");
    const partners = await dir.worksWellWith(ids.photo);
    expect(partners.map((p) => p.name)).toEqual(["Couples test florist"]); // the hidden partner is never named
    expect(await dir.publicProfile("couples-test-hidden-testville")).toBeNull();
  });

  it("works out where a couple came from", async () => {
    const florist = (await profile.coupleProfile(ids.florist))!.public_slug!;
    expect(await dir.resolveSource(ids.photo, florist, null)).toEqual({ source: "partner_profile", viaPlaceId: ids.florist });
    expect(await dir.resolveSource(ids.photo, "couples-test-hidden-testville", "referral")).toEqual({ source: "referral", viaPlaceId: null });
    expect(await dir.resolveSource(ids.photo, null, "featured")).toEqual({ source: "direct_profile", viaPlaceId: null });
    expect(await dir.resolveSource(ids.photo, null, "joint_promotion")).toMatchObject({ source: "joint_promotion" });
  });

  it("takes inquiries only when couples are open, filters bots, and tells both sides", async () => {
    const slug = (await profile.coupleProfile(ids.photo))!.public_slug!;
    const florist = (await profile.coupleProfile(ids.florist))!.public_slug!;
    const base = { slug, name: "Ana & Ben", email: "ana@sc-couples.example", message: "October in Fort Worth?", consent: "on", wedding_date: "2027-10-09", guest_count: "120", budget: "$2,500–$5,000" };
    const ctx = { visitorKey: "visitor-1", notify: notify as never };
    expect(await inq.submitInquiry(base, ctx)).toEqual({ status: "closed" });
    process.env.COUPLES_OPEN = "true";
    expect(await inq.submitInquiry({ ...base, company_website: "spam" }, ctx)).toMatchObject({ status: "ok", spam: true });
    expect(await inq.submitInquiry({ ...base, consent: "" }, ctx)).toMatchObject({ status: "invalid", errors: { consent: expect.any(String) } });
    expect(await inq.submitInquiry({ ...base, via: florist }, ctx)).toMatchObject({ status: "ok", vendorName: "Couples test photo" });
    expect(sent.map((s) => s.to).sort()).toEqual(["ana@sc-couples.example", "photo@sc-couples.example"]);
    const [row] = await db`select source, via_place_id::int, guest_count, status from inquiries where place_id = ${ids.photo}`;
    expect(row).toEqual({ source: "partner_profile", via_place_id: ids.florist, guest_count: 120, status: "new" });
    // The same couple can't flood one vendor.
    await inq.submitInquiry(base, { ...ctx, visitorKey: "visitor-2" });
    expect(await inq.submitInquiry(base, { ...ctx, visitorKey: "visitor-3" })).toEqual({ status: "limited" });
  });

  it("shows an inquiry only to the vendor it was sent to", async () => {
    const mine = await inq.inquiriesFor(asMember("photo"), ids.photo);
    const viaPartner = mine.find((q) => q.source === "partner_profile")!;
    expect(viaPartner).toMatchObject({ name: "Ana & Ben", via_name: "Couples test florist", status: "new" });
    expect(await inq.inquiriesFor(asMember("florist"), ids.photo)).toEqual([]);
    expect(await inq.setInquiryStatus(asMember("florist"), ids.photo, viaPartner.id, "booked")).toBe(false);
    expect(await inq.setInquiryStatus(asMember("photo"), ids.photo, viaPartner.id, "paid")).toBe(false);
    expect(await inq.setInquiryStatus(asMember("photo"), ids.photo, viaPartner.id, "booked")).toBe(true);
  });

  it("reports results by source", async () => {
    await dir.recordView(ids.photo, "direct_profile");
    await dir.recordView(ids.photo, "partner_profile");
    await dir.recordView(ids.photo, "partner_profile");
    const r = await inq.resultsFor(ids.photo);
    expect(r.views).toMatchObject({ direct_profile: 1, partner_profile: 2 });
    expect(r.inquiries.partner_profile).toBe(1);
    expect(r.booked).toBe(1);
    expect(r.livePartnerships).toBe(2);
  });

  it("hides the profile again when its last photo is removed", async () => {
    const photos = await profile.photosFor(ids.florist);
    for (const ph of photos) await profile.removePhoto(asMember("florist"), ids.florist, ph.id);
    expect((await profile.coupleProfile(ids.florist))!.public_visible).toBe(false);
    expect((await dir.worksWellWith(ids.photo)).length).toBe(0);
  });
});
