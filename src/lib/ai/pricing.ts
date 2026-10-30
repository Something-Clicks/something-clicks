/**
 * Claude Haiku 5.5 pricing and the monthly spend cap. Thinking tokens are
 * billed as output, so every cost bound uses max_tokens for the output side.
 */

export const MODEL = "claude-haiku-5-5";

/** US dollars per million tokens (prompts up to 100K tokens; ours are far smaller). */
export const PRICE = { input: 0.1, output: 0.5 } as const;

/** Per-request output ceiling. Doubles as the worst case the cap gate charges for. */
export const MAX_TOKENS = 8000;

export const DEFAULT_CAP_USD = 10;

export function monthlyCap(value = process.env.AI_MONTHLY_CAP_USD): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP_USD;
}

export const costUsd = (u: { input_tokens: number; output_tokens: number }) =>
  (u.input_tokens * PRICE.input + u.output_tokens * PRICE.output) / 1_000_000;

/** Rough, high token count for a prompt (about 3 characters per token for JSON-heavy text). */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3);

/** The most one request can cost: its estimated input plus a full max_tokens of output. */
export const worstCaseUsd = (promptChars: number) =>
  costUsd({ input_tokens: Math.ceil(promptChars / 3), output_tokens: MAX_TOKENS });

/** A request may run only if even its worst case keeps this month's spend within the cap. */
export const withinCap = (spentUsd: number, nextWorstCaseUsd: number, capUsd: number) => spentUsd + nextWorstCaseUsd <= capUsd;
