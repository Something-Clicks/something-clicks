/**
 * Planner Partners against a real database: clickwrap acceptance records,
 * applications, admin marking, vendor invites and stats, reminders, and the
 * rule that the program never touches matching. Needs TEST_DATABASE_URL.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { addMonths, currentAgreement, upcomingAgreement } from "@/lib/planner/partners";

describe("Planner Partner rules that need no database", () => {
  it("defaults to 12 months and handles month ends", () => {
    expect(addMonths("2026-10-31", 12)).toBe("2027-10-31");
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
  });

  it("publishes version 1.0 as the current agreement", () => {
    expect(currentAgreement().version).toBe("1.0");
    expect(upcomingAgreement("2026-11-01")).toBeNull();
  });

  it("keeps the program out of matching, ranking and search", () => {
    const dir = join(__dirname, "..", "supabase", "migrations");
    const matching = readdirSync(dir)
      .map((f) => readFileSync(join(dir, f), "utf8"))
      .flatMap((s) => s.split(/create or replace function/i).filter((x) => /^\s*(compute_matches|needs_confirmation)/i.test(x)));
    const code = ["src/lib/network/search.ts", "src/lib/members/network.ts"].map((f) => readFileSync(join(__dirname, "..", f), "utf8"));
    for (const text of [...matching, ...code]) expect(text).not.toMatch(/planner_partners|vendor_invites|agreement_acceptances/);
  });
});

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;
if (URL) {
  process.env.SUPABASE_DB_URL = URL;
  process.env.NOTIFY_EMAIL_TO = "admin@sc-pp.example";
}

d("Planner Partners", async () => {
  const pp = await import("@/lib/planner/partners");
  const db = URL ? postgres(URL, { max: 1 }) : (null as unknown as postgres.Sql);
  const ids: Record<string, number> = {};
  let member = { id: 0, email: "planner@sc-pp.example" };

  const place = async (key: string, category: string, state: string, claimed: boolean) => {
    const [p] = await db<{ id: number }[]>`
      insert into places (source, name, category_id, geog, state, locality)
      values ('member', ${"PP test " + key}, ${category}, st_setsrid(st_makepoint(-150, 10), 4326)::geography, ${state}, 'Testville')
      returning id::int`;
    ids[key] = p.id;
    if (claimed) {
      await db`insert into place_claims (place_id, email, member_id, method, status) values (${p.id}, ${member.email}, ${member.id}, 'email_domain', 'approved')`;
      await db`insert into profiles (place_id, member_id, contact_email) values (${p.id}, ${member.id}, ${member.email})`;
    }
  };
  const owned = (key: string, category = "wedding_planners", state = "verified") =>
    ({ id: ids[key], name: "PP test " + key, state, category_id: category }) as unknown as Parameters<typeof pp.apply>[1];

  beforeAll(async () => {
    const [m] = await db<{ id: number }[]>`insert into members (email) values ('planner@sc-pp.example') returning id::int`;
    member = { id: m.id, email: "planner@sc-pp.example" };
    await place("planner", "wedding_planners", "verified", true);
    await place("photo", "photographers", "verified", true);
    await place("unclaimed", "wedding_planners", "listed", false);
  });

  afterAll(async () => {
    await db`delete from places where id in ${db(Object.values(ids))}`;
    await db`delete from place_claims where email in ('planner@sc-pp.example', 'vendor1@sc-pp.example')`;
    await db`delete from members where email like '%@sc-pp.example'`;
    await db.end();
  });

  it("applies only with the box ticked, and records the acceptance", async () => {
    const m = member as Parameters<typeof pp.apply>[0];
    expect(await pp.apply(m, owned("photo", "photographers"), "", true, "1.2.3.4")).toMatchObject({ ok: false }); // not a planner
    expect(await pp.apply(m, owned("planner"), "", false, "1.2.3.4")).toMatchObject({ ok: false }); // box not ticked
    expect(await pp.apply(m, owned("planner"), "Love to help", true, "203.0.113.7")).toEqual({ ok: true });
    expect(await pp.apply(m, owned("planner"), "", true, "203.0.113.7")).toMatchObject({ ok: false }); // already pending
    const [a] = await db`select version, email, place_id::int, ip, member_id::int from agreement_acceptances where place_id = ${ids.planner}`;
    expect(a).toEqual({ version: "1.0", email: member.email, place_id: ids.planner, ip: "203.0.113.7", member_id: member.id });
    expect((await pp.listApplications()).find((x) => x.place_id === ids.planner)).toMatchObject({ version: "1.0", ip: "203.0.113.7" });
  });

  it("makes only claimed, verified businesses partners, for 12 months by default", async () => {
    expect(await pp.markPartner(ids.unclaimed)).toMatchObject({ ok: false });
    expect(await pp.markPartner(ids.planner)).toEqual({ ok: true });
    const p = await pp.partnerFor(ids.planner);
    const today = new Date().toISOString().slice(0, 10);
    expect(p).toMatchObject({ starts_on: today, ends_on: addMonths(today, 12), active: true });
    expect((await pp.activePartnerIds([ids.planner, ids.photo])).has(ids.planner)).toBe(true);
    expect(await pp.listApplications()).not.toContainEqual(expect.objectContaining({ place_id: ids.planner })); // application approved
  });

  it("takes up to 10 vendor invites, counts claims, and reports stats", async () => {
    expect((await pp.addInvites(ids.photo, [{ name: "X", category_id: "", city: "", contact_email: "x@sc-pp.example", note: "" }])).added).toBe(0);
    const rows = Array.from({ length: 12 }, (_, i) => ({ name: `Vendor ${i}`, category_id: "florists", city: "Testville", contact_email: `vendor${i}@sc-pp.example`, note: "" }));
    const res = await pp.addInvites(ids.planner, rows);
    expect(res.added).toBe(10);
    expect(res.error).toMatch(/up to 10/);
    // Vendor 1 claims a business with the invited address.
    await db`insert into place_claims (place_id, email, method, status) values (${ids.unclaimed}, 'vendor1@sc-pp.example', 'manual', 'approved')`;
    const row = (await pp.listPartners()).find((r) => r.place_id === ids.planner)!;
    expect(row).toMatchObject({ invited: 10, claimed: 1, intros_accepted: 0, partnerships_live: 0, agreement_version: "1.0", accepted_ip: "203.0.113.7" });
    const queue = await pp.inviteQueue();
    expect(queue.filter((q) => q.partner_place_id === ids.planner)).toHaveLength(10);
    // Nothing is emailed without MAILING_ADDRESS and INVITE_EMAIL_FROM.
    expect(await pp.approveInvite(queue[0].id)).toMatchObject({ ok: false });
  });

  it("reminds the admin once, 30 days before a partnership ends", async () => {
    const in20 = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    await db`update planner_partners set ends_on = ${in20}, end_reminder_sent_at = null where place_id = ${ids.planner}`;
    expect((await pp.sendReminders()).endReminders).toBeGreaterThanOrEqual(1);
    expect((await pp.sendReminders()).endReminders).toBe(0);
  });
});
