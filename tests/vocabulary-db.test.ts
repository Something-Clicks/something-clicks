/**
 * Unmatched searches and the admin actions on them, against a real database:
 * logging, synonyms, approved categories, and businesses waiting for a
 * category. Needs TEST_DATABASE_URL (all migrations and the journeys seed).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { cleanTerm } from "@/lib/network/vocabulary";

describe("search terms we store", () => {
  it("keeps plain text and drops anything like contact details", () => {
    expect(cleanTerm("  Wedding  OFFICIANT ")).toBe("wedding officiant");
    expect(cleanTerm("me@example.com")).toBeNull();
    expect(cleanTerm("call 214-555-0100")).toBeNull();
    expect(cleanTerm("www.mybiz.com")).toBeNull();
    expect(cleanTerm("x")).toBeNull();
    expect(cleanTerm("one two three four five six seven")).toBeNull();
  });
});

const URL = process.env.TEST_DATABASE_URL;
const d = URL ? describe : describe.skip;
if (URL) process.env.SUPABASE_DB_URL = URL;

d("unmatched searches in admin", async () => {
  const v = await import("@/lib/network/vocabulary");
  const db = URL ? postgres(URL, { max: 1 }) : (null as unknown as postgres.Sql);
  const placeIds: number[] = [];

  const waitingBusiness = async (term: string) => {
    const [p] = await db<{ id: number }[]>`
      insert into places (source, name, category_id, geog, state, unmatched_term)
      values ('member', ${"Test " + term}, null, st_setsrid(st_makepoint(-150, 10), 4326)::geography, 'verified', ${term})
      returning id::int`;
    placeIds.push(p.id);
    return p.id;
  };

  beforeAll(async () => {
    await db`delete from search_terms where term like 'sctest %'`;
  });

  afterAll(async () => {
    await db`delete from places where id in ${db(placeIds.length ? placeIds : [0])}`;
    await db`delete from complements where category_a = 'sctest_officiants' or category_b = 'sctest_officiants'`;
    await db`delete from search_terms where term like 'sctest %'`;
    await db`delete from categories where id = 'sctest_officiants'`;
    await db`update categories set extra_synonyms = array_remove(extra_synonyms, 'sctest photo booth hire') where id = 'event_rentals'`;
    await db.end();
  });

  it("counts unmatched terms", async () => {
    await v.logUnmatched("SCTEST officiant");
    await v.logUnmatched("sctest officiant");
    await v.logUnmatched("sctest me@example.com"); // never stored
    const rows = await db<{ term: string; searches: number }[]>`select term, searches from search_terms where term like 'sctest %'`;
    expect(rows).toEqual([{ term: "sctest officiant", searches: 2 }]);
  });

  it("adds a synonym that search uses at once and assigns waiting businesses", async () => {
    await v.logUnmatched("sctest photo booth hire");
    const waiting = await waitingBusiness("sctest photo booth hire");
    expect((await v.listTerms()).find((t) => t.term === "sctest photo booth hire")?.waiting).toBe(1);

    const res = await v.addSynonym("sctest photo booth hire", "event_rentals");
    expect(res).toEqual({ ok: true, placeIds: [waiting] });
    const vocab = await v.liveVocabulary();
    expect(vocab.find((c) => c.id === "event_rentals")?.synonyms).toContain("sctest photo booth hire");
    const [p] = await db<{ category_id: string; unmatched_term: string | null }[]>`select category_id, unmatched_term from places where id = ${waiting}`;
    expect(p).toEqual({ category_id: "event_rentals", unmatched_term: null });
    expect(await v.mappedCategory("sctest photo booth hire")).toBe("event_rentals");
  });

  it("drafts a category with AI only for known terms, keeping only real pairings", async () => {
    const { draftCategoryFor } = await import("@/lib/ai/category-draft");
    const { mockProvider } = await import("@/lib/ai/provider");
    expect(await draftCategoryFor("sctest never searched", mockProvider)).toMatchObject({ ok: false });
    const res = await draftCategoryFor("sctest officiant", mockProvider);
    expect(res).toMatchObject({ ok: true, costUsd: 0 });
    const [row] = await db<{ draft: { pairs: { category: string }[] } }[]>`
      select draft from category_drafts where term = 'sctest officiant' order by id desc limit 1`;
    expect(row.draft.pairs.length).toBeGreaterThan(0);
    expect(row.draft.pairs.every((p) => !["jewelers", "salons", "bakeries", "flower_gift_shops"].includes(p.category))).toBe(true);
    await db`delete from category_drafts where term = 'sctest officiant'`;
    await db`delete from ai_usage where kind = 'category_draft' and mocked`;
  });

  it("creates a category only from an approved, valid draft", async () => {
    const waiting = await waitingBusiness("sctest officiant");
    const [draft] = await db<{ id: number }[]>`
      insert into category_drafts (term, draft) values ('sctest officiant', '{}'::jsonb) returning id::int`;
    const base = {
      id: "sctest_officiants", label: "Officiant", plural: "officiants", stage: "weddings.week", synonyms: ["minister"], taxonomy: ["sctest_officiant"],
      pairs: [{ category: "wedding_planners", reason_to: "hub_planner", reason_from: "hub_vendor", partnership_type: "referral" as const, strength: 1 }],
    };
    expect(await v.approveDraft(draft.id, { ...base, pairs: [{ ...base.pairs[0], category: "nope" }] })).toMatchObject({ ok: false });
    expect(await v.approveDraft(draft.id, { ...base, taxonomy: ["florist"] })).toMatchObject({ ok: false }); // already mapped

    expect(await v.approveDraft(draft.id, base)).toEqual({ ok: true, placeIds: [waiting] });
    const pairs = await db<{ category_a: string; reason_key: string; source: string }[]>`
      select category_a, reason_key, source from complements where 'sctest_officiants' in (category_a, category_b) order by category_a`;
    expect(pairs).toEqual([
      { category_a: "sctest_officiants", reason_key: "hub_planner", source: "admin" },
      { category_a: "wedding_planners", reason_key: "hub_vendor", source: "admin" },
    ]);
    const [p] = await db<{ category_id: string }[]>`select category_id from places where id = ${waiting}`;
    expect(p.category_id).toBe("sctest_officiants");
    const vocab = await v.liveVocabulary();
    expect(vocab.find((c) => c.id === "sctest_officiants")?.synonyms).toEqual(expect.arrayContaining(["sctest officiant", "minister"]));
    // A second approval of the same draft does nothing.
    expect(await v.approveDraft(draft.id, { ...base, id: "sctest_officiants_two" })).toMatchObject({ ok: false });
  });
});
