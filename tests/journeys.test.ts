import { describe, expect, it } from "vitest";
import { categoryById, journeys, reasonText, resolveCategories } from "@/content/journeys";

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
});
