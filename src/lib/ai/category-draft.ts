import { sql } from "@/lib/db";
import { cleanTerm, type CategoryDraft } from "@/lib/network/vocabulary";
import { costUsd, monthlyCap, withinCap, worstCaseUsd } from "./pricing";
import { categoryDraftSystem } from "./prompts";
import type { AiProvider, DraftInput } from "./provider";
import { monthSpend } from "./jobs";

export type DraftRun = { ok: true; draftId: number; costUsd: number } | { ok: false; error: string };

/**
 * One AI draft of a new category for an unmatched term, saved for an admin to
 * edit and approve. Runs only when an admin asks; never over the monthly cap.
 */
export async function draftCategoryFor(rawTerm: string, provider: AiProvider, cap = monthlyCap()): Promise<DraftRun> {
  const term = cleanTerm(rawTerm);
  if (!term) return { ok: false, error: "That term can't be used." };
  const [known] = await sql()`select 1 from search_terms where term = ${term}`;
  if (!known) return { ok: false, error: "Unknown term." };

  const stages = await sql()<{ id: string; label: string }[]>`
    select s.id, s.label from journey_stages s join journeys j on j.id = s.journey_id where j.active order by s.position`;
  const categories = await sql()<{ id: string; label: string; stage: string }[]>`
    select c.id, c.label, c.stage_id as stage from categories c join journeys j on j.id = c.journey_id
    where j.active and not c.broad order by c.id`;
  const input: DraftInput = { term, stages, categories };

  if (!provider.mocked && !withinCap(await monthSpend(), worstCaseUsd(categoryDraftSystem().length + JSON.stringify(input).length), cap)) {
    return { ok: false, error: "Monthly AI cap reached." };
  }
  const res = await provider.draftCategory(input);
  const cost = provider.mocked ? 0 : costUsd(res.usage);
  await sql()`
    insert into ai_usage (kind, model, items, input_tokens, output_tokens, cost_usd, mocked)
    values ('category_draft', ${provider.name}, 1, ${res.usage.input_tokens}, ${res.usage.output_tokens}, ${cost}, ${provider.mocked})`;
  if (!res.draft) return { ok: false, error: res.skipped === "refused" ? "The model declined to draft this one." : "The draft came back incomplete. Try again." };

  // Keep only pairings with categories that exist; the admin can still edit everything before approving.
  const ids = new Set(categories.map((c) => c.id));
  const draft: CategoryDraft = { ...res.draft, pairs: res.draft.pairs.filter((p) => ids.has(p.category)) };
  const [row] = await sql()<{ id: number }[]>`
    insert into category_drafts (term, draft) values (${term}, ${sql().json(draft)}) returning id::int`;
  return { ok: true, draftId: row.id, costUsd: cost };
}
