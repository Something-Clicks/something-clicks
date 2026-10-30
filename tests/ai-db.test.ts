/**
 * AI jobs end to end against a real database, with the mock provider and a
 * fake "paid" provider for the cap. Needs TEST_DATABASE_URL with all migrations
 * and the journeys seed (e.g. local sc_dev). Fixtures sit in the Pacific.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;
if (URL) process.env.SUPABASE_DB_URL = URL;

d("AI jobs", async () => {
  const jobs = await import("@/lib/ai/jobs");
  const { mockProvider } = await import("@/lib/ai/provider");
  const db = URL ? postgres(URL, { max: 1 }) : (null as unknown as postgres.Sql);
  const ids: Record<string, number> = {};
  let cluster = 0;

  beforeAll(async () => {
    const [c] = await db<{ id: number }[]>`
      insert into clusters (slug, name, journey_id, min_lng, min_lat, max_lng, max_lat, center, scope, status)
      values ('ai-test-metro', 'AI test metro', 'weddings', -151, 9, -149, 11, st_setsrid(st_makepoint(-150, 10), 4326)::geography, 'metro', 'active')
      returning id::int`;
    cluster = c.id;
    const rows: [string, string, string, string][] = [
      ["partycity", "Party City", "stationers", "name_rule"],
      ["bridalsalon", "Belle Bridal Hair Studio", "salons", "taxonomy"],
      ["plainsalon", "Main Street Cuts", "salons", "taxonomy"],
      ["ownersalon", "Owner Set Salon", "salons", "owner"],
      ["photo", "Test Lens Photography", "photographers", "taxonomy"],
      ["planner", "Test Rose Planning", "wedding_planners", "taxonomy"],
    ];
    for (const [key, name, cat, by] of rows) {
      const [p] = await db<{ id: number }[]>`
        insert into places (source, gers_id, name, category_id, classified_by, geog, confidence, locality, region)
        values ('overture', ${"ai-test-" + key}, ${name}, ${cat}, ${by}, st_setsrid(st_makepoint(-150, 10), 4326)::geography, 0.9, 'Testville', 'HI')
        returning id::int`;
      ids[key] = p.id;
    }
    for (const [a, b] of [["photo", "planner"], ["planner", "photo"]]) {
      await db`insert into matches (place_a, place_b, cluster_id, score, c, d, s, distance_m, partnership_type, reason_key)
               values (${ids[a]}, ${ids[b]}, ${cluster}, 0.9, 1, 1, 1, 900, 'referral', 'hub')`;
    }
  });

  afterAll(async () => {
    await db`delete from places where gers_id like 'ai-test-%'`;
    await db`delete from clusters where slug = 'ai-test-metro'`;
    await db`delete from ai_usage where model in ('mock', 'fake-paid') and created_at > now() - interval '1 hour'`;
    await db.end();
  });

  it("reviews the right listings and applies only confident answers", async () => {
    const candidates = await jobs.reviewCandidates(50, cluster);
    expect(candidates.map((c) => c.name).sort()).toEqual(["Belle Bridal Hair Studio", "Main Street Cuts", "Party City"]); // owner-set and specific/confident ones left out
    const r = await jobs.runReview(mockProvider, 50, 10, cluster);
    expect(r).toMatchObject({ requests: 1, items: 3, applied: 2, costUsd: 0 });
    const rows = await db<{ name: string; serves_journey: boolean | null }[]>`select name, serves_journey from places where gers_id like 'ai-test-%' order by name`;
    expect(Object.fromEntries(rows.map((x) => [x.name, x.serves_journey]))).toMatchObject({
      "Party City": false, "Belle Bridal Hair Studio": true, "Main Street Cuts": null, "Owner Set Salon": null,
    });
    expect(await jobs.reviewCandidates(50, cluster)).toEqual([]); // reviewed once only
    const [u] = await db`select mocked, cost_usd from ai_usage where model = 'mock' order by id desc limit 1`;
    expect(u.mocked).toBe(true);
  });

  it("writes honest reasons and drops ones that break the rules", async () => {
    const liar = { ...mockProvider, async rationales(items: { key: string }[]) {
      return { usage: { input_tokens: 0, output_tokens: 0 }, results: items.map((i, n) => ({ key: i.key, rationale: n === 0 ? "Test Rose plans weddings nine hundred meters from your studio." : "They're a member waiting to connect!" })) };
    } };
    const r = await jobs.runRationales(liar, 50, 10, cluster);
    expect(r).toMatchObject({ items: 2, applied: 1 });
    const saved = await db`select ai_rationale from matches where cluster_id = ${cluster} and ai_rationale is not null`;
    expect(saved).toHaveLength(1);
    expect(saved[0].ai_rationale).not.toMatch(/member/);
  });

  it("stops before a paid request that could pass the cap", async () => {
    let calls = 0;
    const paid = { ...mockProvider, name: "fake-paid", mocked: false, async review() { calls++; return { results: [], usage: { input_tokens: 0, output_tokens: 0 } }; } };
    await db`update places set serves_journey = null where gers_id = 'ai-test-plainsalon'`;
    await db`delete from ai_reviews where place_id = ${ids.plainsalon}`;
    const spent = await jobs.monthSpend();
    const r = await jobs.runReview(paid, 50, spent + 0.001, cluster); // less headroom than one worst-case request
    expect(calls).toBe(0);
    expect(r.stopped).toBe("Monthly AI cap reached.");
    const ok = await jobs.runReview(paid, 50, spent + 1, cluster);
    expect(calls).toBe(1);
    expect(ok.stopped).toBeUndefined();
  });
});
