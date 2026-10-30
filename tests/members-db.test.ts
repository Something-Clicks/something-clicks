/**
 * Introductions and partnerships against a real database: who may do what,
 * and when contact details are shared. Needs TEST_DATABASE_URL pointing at a
 * database with all migrations and the journeys seed (e.g. local sc_dev).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;
if (URL) process.env.SUPABASE_DB_URL = URL;

d("member network rules", async () => {
  const net = await import("@/lib/members/network");
  const db = URL ? postgres(URL, { max: 1 }) : (null as unknown as postgres.Sql);
  const ids: Record<string, number> = {};
  const members: Record<string, { id: number; email: string }> = {};

  beforeAll(async () => {
    // Middle of the Pacific, so nothing real is nearby.
    for (const [key, cat, lng] of [["photo", "photographers", -150], ["planner", "wedding_planners", -150.01], ["venue", "wedding_venues", -150.02], ["stranger", "florists", -150.03]] as const) {
      const [p] = await db<{ id: number }[]>`
        insert into places (source, name, category_id, geog, state, phone, website)
        values ('member', ${"Test " + key}, ${cat}, st_setsrid(st_makepoint(${lng}, 10), 4326)::geography, 'member', '+18015550100', ${"https://" + key + ".test"})
        returning id::int`;
      ids[key] = p.id;
      const [m] = await db<{ id: number }[]>`insert into members (email) values (${key + "@sc-test.example"}) returning id::int`;
      members[key] = { id: m.id, email: key + "@sc-test.example" };
      await db`insert into profiles (place_id, member_id, contact_email, contact_name, network_opt_in)
               values (${p.id}, ${m.id}, ${key + "@sc-test.example"}, ${"Name " + key}, true)`;
    }
    for (const [a, b] of [["photo", "planner"], ["planner", "photo"], ["photo", "venue"]]) {
      await db`insert into matches (place_a, place_b, score, c, d, s, distance_m, partnership_type, reason_key)
               values (${ids[a]}, ${ids[b]}, 0.9, 1, 1, 1, 500, 'referral', 'test')`;
    }
  });

  afterAll(async () => {
    await db`delete from places where id in ${db(Object.values(ids))}`;
    await db`delete from members where email like '%@sc-test.example'`;
    await db.end();
  });

  it("only owners request, only matches, only members", async () => {
    expect((await net.requestIntroduction(members.planner, ids.photo, ids.planner, "")).status).toBe("error"); // not their business
    expect((await net.requestIntroduction(members.photo, ids.photo, ids.stranger, "")).status).toBe("error"); // not a match
    await db`update places set state = 'verified' where id = ${ids.venue}`;
    expect(await net.requestIntroduction(members.photo, ids.photo, ids.venue, "")).toEqual({ status: "error", error: "This business isn't on Something Clicks yet." });
  });

  it("shares contact details only after the other side accepts", async () => {
    const r = await net.requestIntroduction(members.photo, ids.photo, ids.planner, "hi");
    expect(r.status).toBe("requested");
    expect((await net.requestIntroduction(members.photo, ids.photo, ids.planner, "again")).status).toBe("exists");
    const [pending] = await net.introductionsFor(ids.photo);
    expect(pending.contact_email).toBeNull();
    expect(pending.contact_phone).toBeNull();

    // The requester can't accept their own request.
    expect((await net.respondIntroduction(members.photo, pending.id, true)).ok).toBe(false);
    expect((await net.respondIntroduction(members.planner, pending.id, true)).ok).toBe(true);
    const [connected] = await net.introductionsFor(ids.photo);
    expect(connected.contact_email).toBe("planner@sc-test.example");
    const [{ status }] = await db`select status from matches where place_a = ${ids.photo} and place_b = ${ids.planner}`;
    expect(status).toBe("connected");
  });

  it("partnerships need both sides, and tracking links point at the partner", async () => {
    const [intro] = await net.introductionsFor(ids.photo);
    expect(await net.proposePartnership(members.stranger, ids.stranger, intro.id, { type: "referral", offer: "x", code: "", link: "" })).toBe(false);
    expect(await net.proposePartnership(members.photo, ids.photo, intro.id, { type: "joint_offer", offer: "Free session", code: "", link: "https://photo.test/offer" })).toBe(true);
    const [row] = await net.partnershipsFor(ids.photo);
    expect(await net.acceptPartnership(members.photo, ids.photo, row.partnership_id!)).toBe(false); // proposer can't accept
    expect(await net.acceptPartnership(members.stranger, ids.stranger, row.partnership_id!)).toBe(false);
    expect(await net.acceptPartnership(members.planner, ids.planner, row.partnership_id!)).toBe(true);
    const [plannerView] = await net.partnershipsFor(ids.planner);
    expect(await net.followTrackingLink(plannerView.my_code!)).toBe("https://photo.test/offer"); // planner sends people to the photographer's offer
    const [photoView] = await net.partnershipsFor(ids.photo);
    expect(await net.followTrackingLink(photoView.my_code!)).toBe("https://planner.test"); // and the photographer to the planner's site
    expect((await net.partnershipsFor(ids.planner))[0].my_clicks).toBe(1);
    expect(await net.followTrackingLink("nope")).toBeNull();
  });

  it("enforces the daily introduction limit", async () => {
    await db`update places set state = 'member' where id = ${ids.venue}`;
    await db`insert into introductions (from_place, to_place, requested_by, created_at)
             select ${ids.venue}, ${ids.stranger}, ${members.photo.id}, now()`;
    await db`update introductions set requested_by = ${members.photo.id} where from_place = ${ids.photo}`;
    for (let i = 0; i < net.INTRO_LIMIT_PER_DAY - 2; i++) {
      await db`insert into places (source, name, category_id, geog) values ('member', ${"Filler " + i}, 'florists', st_setsrid(st_makepoint(-150.5, 10), 4326)::geography)`;
    }
    const fillers = await db<{ id: number }[]>`select id::int from places where name like 'Filler %' and source = 'member'`;
    for (const f of fillers) await db`insert into introductions (from_place, to_place, requested_by) values (${ids.stranger}, ${f.id}, ${members.photo.id})`;
    expect(await net.requestIntroduction(members.photo, ids.photo, ids.venue, "")).toMatchObject({ status: "error", error: expect.stringContaining("a day") });
    await db`delete from places where name like 'Filler %' and source = 'member'`;
  });
});
