import { describe, expect, it } from "vitest";
import { APPLY_CONFIDENCE, decideReview } from "@/lib/ai/jobs";
import { MAX_TOKENS, MODEL, costUsd, monthlyCap, withinCap, worstCaseUsd } from "@/lib/ai/pricing";
import { acceptableRationale, rationaleSystem, reviewSystem } from "@/lib/ai/prompts";
import { anthropicProvider, getProvider, mockProvider } from "@/lib/ai/provider";

describe("pricing and the monthly cap", () => {
  it("prices Haiku 5.5 at $0.10 / $0.50 per million tokens", () => {
    expect(MODEL).toBe("claude-haiku-5-5");
    expect(costUsd({ input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(0.1);
    expect(costUsd({ input_tokens: 2000, output_tokens: 1000 })).toBeCloseTo(0.0007);
  });

  it("charges the gate for a full max_tokens of output", () => {
    expect(worstCaseUsd(0)).toBeCloseTo((MAX_TOKENS * 0.5) / 1e6);
    expect(withinCap(9.998, worstCaseUsd(6000), 10)).toBe(false); // worst case is about $0.0042
    expect(withinCap(9.9, worstCaseUsd(6000), 10)).toBe(true);
  });

  it("defaults the cap to $10 and accepts an override", () => {
    expect(monthlyCap(undefined)).toBe(10);
    expect(monthlyCap("25")).toBe(25);
    expect(monthlyCap("nonsense")).toBe(10);
    expect(monthlyCap("-1")).toBe(10);
  });
});

describe("provider selection", () => {
  it("is off without a key, mock only on request and never in production", () => {
    expect(getProvider({})).toBeNull();
    expect(getProvider({ AI_MOCK: "true", NODE_ENV: "development" })).toBe(mockProvider);
    expect(getProvider({ AI_MOCK: "true", NODE_ENV: "production" })).toBeNull();
    expect(getProvider({ ANTHROPIC_API_KEY: "sk-ant-test" })?.name).toBe("claude-haiku-5-5");
  });
});

describe("applying a review", () => {
  const listed = { serves_journey: null, classified_by: "taxonomy", state: "listed" };
  it("applies only a confident yes or no on an unclassified, unclaimed listing", () => {
    expect(decideReview({ serves: "no", confidence: 0.92 }, listed)).toEqual({ apply: true, serves_journey: false });
    expect(decideReview({ serves: "yes", confidence: APPLY_CONFIDENCE }, listed)).toEqual({ apply: true, serves_journey: true });
    expect(decideReview({ serves: "yes", confidence: 0.79 }, listed).apply).toBe(false);
    expect(decideReview({ serves: "unsure", confidence: 0.99 }, listed).apply).toBe(false);
  });
  it("never overrides an owner, an admin, a claimed business, or an existing answer", () => {
    for (const p of [{ ...listed, classified_by: "owner" }, { ...listed, classified_by: "admin" }, { ...listed, state: "verified" }, { ...listed, serves_journey: true }]) {
      expect(decideReview({ serves: "no", confidence: 0.99 }, p).apply).toBe(false);
    }
  });
});

describe("match reason honesty filter", () => {
  it("keeps plain reasons", () => {
    expect(acceptableRationale("Twisted Rose plans Fort Worth weddings half a mile from your studio.")).toBe(true);
  });
  it("drops implied relationships, hype, and anything too long", () => {
    for (const bad of [
      "Twisted Rose is a member and wants to connect with you.",
      "They are waiting to hear from you about referrals.",
      "Award-winning planners who already work with photographers like you.",
      "The best in Fort Worth!",
      "Great fit 💍 for your couples in Fort Worth this year.",
      "Too short.",
      "This is a very long reason that keeps going and going with many more words than anyone would ever want to read on a small card in the dashboard.",
    ]) expect(acceptableRationale(bad), bad).toBe(false);
  });
  it("tells the model the same rules", () => {
    expect(rationaleSystem()).toMatch(/Never say or imply B knows A/);
    expect(reviewSystem()).toMatch(/Prefer unsure over a guess/);
    expect(reviewSystem()).toContain("wedding_venues: Wedding venue");
  });
});

describe("mock provider", () => {
  it("is deterministic and free", async () => {
    const r = await mockProvider.review([
      { id: 1, name: "Party City", category_id: "stationers", taxonomy: "cards_and_stationery_store", domain: "partycity.com", city: "Plano, TX" },
      { id: 2, name: "Belle Bridal Hair", category_id: "salons", taxonomy: "hair_salon", domain: "", city: "Dallas, TX" },
      { id: 3, name: "Main Street Cuts", category_id: "salons", taxonomy: "hair_salon", domain: "", city: "Dallas, TX" },
    ]);
    expect(r.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
    expect(r.results.map((x) => x.serves)).toEqual(["no", "yes", "unsure"]);
    const m = await mockProvider.rationales([{ key: "1-2", a: { name: "A", category: "Photographer", city: "Plano" }, b: { name: "Twisted Rose", category: "Wedding planner", city: "Fort Worth" }, miles: 0.6, why: "They plan the weddings you work." }]);
    expect(acceptableRationale(m.results[0].rationale)).toBe(true);
  });
});

describe("Haiku request (SDK with a stubbed network)", () => {
  it("sends Haiku 5.5, low effort and a structured format, and returns parsed results with usage", async () => {
    let body: Record<string, unknown> = {};
    const fakeFetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      body = JSON.parse(String(init?.body));
      const results = { results: [{ id: 7, serves: "no", confidence: 0.9, category: "unchanged", reason: "Party supply chain." }] };
      return new Response(
        JSON.stringify({
          id: "msg_test", type: "message", role: "assistant", model: "claude-haiku-5-5",
          content: [{ type: "text", text: JSON.stringify(results) }],
          stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1800, output_tokens: 420 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as typeof fetch;

    const p = anthropicProvider("sk-ant-test", fakeFetch);
    const r = await p.review([{ id: 7, name: "Party City", category_id: "stationers", taxonomy: "cards_and_stationery_store", domain: "", city: "Plano, TX" }]);

    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.max_tokens).toBe(MAX_TOKENS);
    const oc = body.output_config as { effort: string; format: { type: string; schema: unknown } };
    expect(oc.effort).toBe("low");
    expect(oc.format.type).toBe("json_schema");
    expect(JSON.stringify(oc.format.schema)).toContain("unchanged");
    expect(r.results).toEqual([{ id: 7, serves: "no", confidence: 0.9, category: "unchanged", reason: "Party supply chain." }]);
    expect(r.usage).toEqual({ input_tokens: 1800, output_tokens: 420 });
  });

  it("returns nothing (but still reports usage) on a refusal", async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ id: "m", type: "message", role: "assistant", model: "claude-haiku-5-5", content: [], stop_reason: "refusal", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } }), {
        status: 200, headers: { "content-type": "application/json" },
      })) as typeof fetch;
    const r = await anthropicProvider("k", fakeFetch).rationales([]);
    expect(r).toMatchObject({ results: [], skipped: "refused", usage: { input_tokens: 10 } });
  });
});
