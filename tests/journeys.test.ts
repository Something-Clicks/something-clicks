import { describe, expect, it } from "vitest";
import {
  categoryById, closestVocabulary, journeys, matchVocabulary, reasonText, resolveCategories, staticVocabulary, suggestVocabulary,
} from "@/content/journeys";

describe("journey map", () => {
  it("loads the weddings journey with typed categories", () => {
    const weddings = journeys.find((j) => j.id === "weddings");
    expect(weddings?.active).toBe(true);
    expect(weddings?.categories).toHaveLength(17);
    expect(categoryById("salons")?.broad).toBe(true);
    expect(categoryById("wedding_planners")?.hub).toBe("planner");
    expect(reasonText("weddings", "day_of")).toBe("They work the same weddings you do.");
  });

  it("resolves what a business does to categories", () => {
    expect(resolveCategories("wedding photographer")[0].id).toBe("photographers");
    expect(resolveCategories("Florist")[0].id).toBe("florists");
    expect(resolveCategories("DJ")[0].id).toBe("djs_music");
    expect(resolveCategories("we do catering")[0].id).toBe("caterers");
    expect(resolveCategories("bridal makeup")[0].id).toBe("hair_makeup");
    expect(resolveCategories("reception hall")[0].id).toBe("wedding_venues");
    expect(resolveCategories("cakes")[0].id).toBe("cake_makers");
  });

  it("returns nothing for unrelated or empty input", () => {
    expect(resolveCategories("")).toEqual([]);
    expect(resolveCategories("tax attorney")).toEqual([]);
  });

  it("doesn't match on generic words like wedding or services", () => {
    expect(resolveCategories("wedding officiant")).toEqual([]);
    expect(resolveCategories("event services")).toEqual([]);
    expect(resolveCategories("djembe lessons")).toEqual([]);
    expect(resolveCategories("wedding cake")[0].id).toBe("cake_makers");
  });
});

describe("type-ahead and no-match help", () => {
  const vocab = staticVocabulary();
  const ids = (q: string) => suggestVocabulary(q, vocab).map((s) => s.entry.id);

  it("suggests categories from labels and synonyms as you type", () => {
    expect(ids("photo")).toContain("photographers");
    expect(ids("photo booth")[0]).toBe("event_rentals");
    expect(suggestVocabulary("photo booth", vocab)[0].via).toBe("photo booth");
    expect(ids("callig")[0]).toBe("stationers");
    expect(ids("flor")[0]).toBe("florists");
    expect(ids("officiant")).toEqual([]);
  });

  it("offers close spellings, or nothing when nothing is close", () => {
    expect(closestVocabulary("florest", vocab)[0].id).toBe("florists");
    expect(closestVocabulary("photographr", vocab)[0].id).toBe("photographers");
    expect(closestVocabulary("tax attorney", vocab)).toEqual([]);
    expect(closestVocabulary("wedding officiant", vocab)).toEqual([]);
    expect(closestVocabulary("wedding florest", vocab)[0].id).toBe("florists");
  });

  it("includes admin-added synonyms and categories", () => {
    const extra = [...vocab, { id: "officiants", journeyId: "weddings", label: "Officiant", plural: "officiants", broad: false, synonyms: ["minister"] }];
    expect(matchVocabulary("wedding officiant", extra)[0].id).toBe("officiants");
    expect(suggestVocabulary("minis", extra)[0].entry.id).toBe("officiants");
  });
});
