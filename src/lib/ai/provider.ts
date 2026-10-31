import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { activeJourneys, categoryById, reasonText } from "@/content/journeys";
import { MAX_TOKENS, MODEL } from "./pricing";
import { categoryDraftSystem, rationaleSystem, REASON_KEYS, reviewSystem } from "./prompts";

export type ReviewItem = { id: number; name: string; category_id: string; taxonomy: string; domain: string; city: string };
export type ReviewResult = { id: number; serves: "yes" | "no" | "unsure"; confidence: number; category: string; reason: string };
export type RationaleItem = {
  key: string;
  a: { name: string; category: string; city: string };
  b: { name: string; category: string; city: string };
  miles: number;
  why: string;
};
export type RationaleResult = { key: string; rationale: string };
export type Usage = { input_tokens: number; output_tokens: number };
export type Batch<T> = { results: T[]; usage: Usage; skipped?: string };

export type DraftInput = {
  term: string;
  stages: { id: string; label: string }[];
  categories: { id: string; label: string; stage: string }[];
};
export type DraftOutput = {
  id: string;
  label: string;
  plural: string;
  stage: string;
  synonyms: string[];
  taxonomy: string[];
  pairs: { category: string; reason_to: string; reason_from: string; partnership_type: "referral" | "joint_offer" | "distribution"; strength: number }[];
  notes: string;
};
export type DraftResult = { draft: DraftOutput | null; usage: Usage; skipped?: string };

export interface AiProvider {
  name: string;
  mocked: boolean;
  review(items: ReviewItem[]): Promise<Batch<ReviewResult>>;
  rationales(items: RationaleItem[]): Promise<Batch<RationaleResult>>;
  draftCategory(input: DraftInput): Promise<DraftResult>;
}

const categoryIds = () => activeJourneys().flatMap((j) => j.categories.map((c) => c.id)) as [string, ...string[]];

const reviewSchema = () =>
  z.object({
    results: z.array(
      z.object({
        id: z.number().int(),
        serves: z.enum(["yes", "no", "unsure"]),
        confidence: z.number(),
        category: z.enum(["unchanged", ...categoryIds()]),
        reason: z.string(),
      }),
    ),
  });

const rationaleSchema = z.object({ results: z.array(z.object({ key: z.string(), rationale: z.string() })) });

const draftSchema = z.object({
  id: z.string(),
  label: z.string(),
  plural: z.string(),
  stage: z.string(),
  synonyms: z.array(z.string()),
  taxonomy: z.array(z.string()),
  pairs: z.array(
    z.object({
      category: z.string(),
      reason_to: z.enum(REASON_KEYS),
      reason_from: z.enum(REASON_KEYS),
      partnership_type: z.enum(["referral", "joint_offer", "distribution"]),
      strength: z.number(),
    }),
  ),
  notes: z.string(),
});

/** Claude Haiku 5.5 through the Anthropic SDK, with structured output so every reply parses. */
export function anthropicProvider(apiKey: string, fetchImpl?: typeof fetch): AiProvider {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000, ...(fetchImpl ? { fetch: fetchImpl } : {}) });

  async function call<T>(system: string, payload: unknown, format: ReturnType<typeof zodOutputFormat>): Promise<Batch<T>> {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      // Classification and one-line copy don't need deep thinking; low effort keeps tokens (and cost) down.
      output_config: { effort: "low", format },
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    });
    const usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };
    if (response.stop_reason === "refusal") return { results: [], usage, skipped: "refused" };
    if (response.stop_reason === "max_tokens" || !response.parsed_output) return { results: [], usage, skipped: "incomplete" };
    return { results: (response.parsed_output as { results: T[] }).results, usage };
  }

  return {
    name: MODEL,
    mocked: false,
    review: (items) => call<ReviewResult>(reviewSystem(), { listings: items }, zodOutputFormat(reviewSchema())),
    rationales: (items) => call<RationaleResult>(rationaleSystem(), { pairs: items }, zodOutputFormat(rationaleSchema)),
    async draftCategory(input) {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: categoryDraftSystem(),
        output_config: { effort: "low", format: zodOutputFormat(draftSchema) },
        messages: [{ role: "user", content: JSON.stringify(input) }],
      });
      const usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };
      if (response.stop_reason === "refusal") return { draft: null, usage, skipped: "refused" };
      if (response.stop_reason === "max_tokens" || !response.parsed_output) return { draft: null, usage, skipped: "incomplete" };
      return { draft: response.parsed_output as DraftOutput, usage };
    },
  };
}

// ---------------------------------------------------------------------------
// Mock: deterministic, free, never used in production. Lets the whole
// pipeline run locally and in tests before an API key exists.
// ---------------------------------------------------------------------------

const CHAINS = /\b(party city|walmart|target|cvs|walgreens|michaels|hobby lobby|kroger|dollar (tree|general)|7-eleven|home depot|lowe'?s|great clips|supercuts|sport clips)\b/i;
const WEDDING = /\b(bridal|bride|wedding|weddings|nuptial|cake|cakes|elope|matrimon)/i;

export const mockProvider: AiProvider = {
  name: "mock",
  mocked: true,
  async review(items) {
    return {
      usage: { input_tokens: 0, output_tokens: 0 },
      results: items.map((i) => {
        const text = `${i.name} ${i.taxonomy}`;
        if (CHAINS.test(i.name)) return { id: i.id, serves: "no", confidence: 0.92, category: "unchanged", reason: "National retail chain; weddings are incidental." };
        if (WEDDING.test(text)) return { id: i.id, serves: "yes", confidence: 0.88, category: "unchanged", reason: "Name or category points to wedding work." };
        return { id: i.id, serves: "unsure", confidence: 0.4, category: "unchanged", reason: "Listing doesn't say whether it does weddings." };
      }),
    };
  },
  async rationales(items) {
    return {
      usage: { input_tokens: 0, output_tokens: 0 },
      results: items.map((i) => ({
        key: i.key,
        rationale: `${i.b.name} is ${i.miles < 1 ? "under a mile" : i.miles < 1.5 ? "about a mile" : `${Math.round(i.miles)} miles`} away in ${i.b.city || "your area"}. ${i.why}`,
      })),
    };
  },
  async draftCategory(input) {
    // A plausible, clearly generic draft: planners and venues as hubs, everyone else "same couples".
    const slug = input.term.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const label = input.term.charAt(0).toUpperCase() + input.term.slice(1);
    return {
      usage: { input_tokens: 0, output_tokens: 0 },
      draft: {
        id: `${slug}s`.replace(/ss$/, "s"),
        label,
        plural: `${input.term}s`.replace(/ss$/, "s"),
        stage: input.stages[input.stages.length - 1]?.id ?? "",
        synonyms: [input.term],
        taxonomy: [slug],
        pairs: input.categories.map((c) => {
          const hub = c.id === "wedding_planners" ? "hub_planner" : c.id === "wedding_venues" ? "hub_venue" : null;
          return hub
            ? { category: c.id, reason_to: hub, reason_from: "hub_vendor", partnership_type: "referral" as const, strength: 1 }
            : { category: c.id, reason_to: "same_couple", reason_from: "same_couple", partnership_type: "distribution" as const, strength: 0.6 };
        }),
        notes: "Mock draft for local testing.",
      },
    };
  },
};

/** The real provider once ANTHROPIC_API_KEY is set; the mock only when asked for, and never in production. */
export function getProvider(env: Record<string, string | undefined> = process.env): AiProvider | null {
  if (env.ANTHROPIC_API_KEY) return anthropicProvider(env.ANTHROPIC_API_KEY);
  if (env.AI_MOCK === "true" && env.NODE_ENV !== "production") return mockProvider;
  return null;
}

/** For mock rationales and prompts: the standard reason line for a pair. */
export const standardWhy = (categoryA: string, reasonKey: string) => reasonText(categoryById(categoryA)?.journeyId ?? "weddings", reasonKey);
