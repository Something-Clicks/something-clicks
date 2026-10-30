import { describe, expect, it } from "vitest";
import { createMemoryStore } from "@/lib/store/memory";
import { sanitizeSearch } from "@/lib/store/types";

describe("memory store filters (mirrors the Supabase queries)", () => {
  it("filters by status, category, service area, and search", async () => {
    const store = createMemoryStore();
    await store.insert("applications", { business_name: "Alpha Movers", category: "Commercial movers", service_areas: ["Sandy"], email: "a@x.co" });
    const { id } = await store.insert("applications", { business_name: "Beta Clean", category: "Commercial cleaning and janitorial", service_areas: ["Murray", "Sandy"], email: "b@x.co" });
    await store.update("applications", id, { status: "reviewing" });

    expect(await store.list("applications", { status: "reviewing" })).toHaveLength(1);
    expect(await store.list("applications", { category: "Commercial movers" })).toHaveLength(1);
    expect(await store.list("applications", { service_area: "Sandy" })).toHaveLength(2);
    expect(await store.list("applications", { service_area: "Murray" })).toHaveLength(1);
    expect((await store.list("applications", { q: "beta" }))[0].business_name).toBe("Beta Clean");
    expect(await store.list("applications", { q: "b@x.co" })).toHaveLength(1);
  });
});

describe("sanitizeSearch", () => {
  it("removes PostgREST filter syntax but keeps emails searchable", () => {
    expect(sanitizeSearch("name,status.eq.accepted)")).toBe("name status.eq.accepted");
    expect(sanitizeSearch("pat@example.com")).toBe("pat@example.com");
    expect(sanitizeSearch("x".repeat(500))).toHaveLength(100);
  });
});
