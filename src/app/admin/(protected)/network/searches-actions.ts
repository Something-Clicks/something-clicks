"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { draftCategoryFor } from "@/lib/ai/category-draft";
import { getProvider } from "@/lib/ai/provider";
import { sql } from "@/lib/db";
import {
  addSynonym, approveDraft, cleanTerm, ignoreTerm, refreshMatchesForPlaces, rejectDraft, reopenTerm, type CategoryDraft, type DraftPair,
} from "@/lib/network/vocabulary";

const PAGE = "/admin/network/searches";
function back(params: Record<string, string>): never {
  redirect(`${PAGE}?${new URLSearchParams(params)}`);
}

/** Matches for businesses that just got a category, after the response is sent. */
const refreshLater = (placeIds: number[]) => {
  if (placeIds.length) after(() => refreshMatchesForPlaces(placeIds).catch((e) => console.error("[vocabulary] match refresh failed", e)));
};

export async function addSynonymAction(formData: FormData) {
  await requireAdmin();
  const term = String(formData.get("term") ?? "");
  const res = await addSynonym(term, String(formData.get("category") ?? ""));
  if (!res.ok) return back({ error: res.error });
  refreshLater(res.placeIds);
  revalidatePath(PAGE);
  back({ done: `“${term}” now matches as a synonym.${res.placeIds.length ? ` ${res.placeIds.length} waiting business(es) assigned.` : ""}` });
}

export async function ignoreAction(formData: FormData) {
  await requireAdmin();
  await ignoreTerm(String(formData.get("term") ?? ""));
  revalidatePath(PAGE);
}

export async function reopenAction(formData: FormData) {
  await requireAdmin();
  await reopenTerm(String(formData.get("term") ?? ""));
  revalidatePath(PAGE);
}

/** "Create category": an AI draft for review. Runs only on this click, within the monthly cap. */
export async function draftAction(formData: FormData) {
  await requireAdmin();
  const term = String(formData.get("term") ?? "");
  const provider = getProvider();
  if (!provider) return back({ error: "AI drafting is off: add ANTHROPIC_API_KEY in Vercel, or start from a blank draft." });
  const res = await draftCategoryFor(term, provider);
  if (!res.ok) return back({ error: res.error });
  revalidatePath(PAGE);
  back({ done: `Draft ready for “${term}”${res.costUsd ? ` ($${res.costUsd.toFixed(4)})` : ""}. Review it below.` });
}

/** A blank draft to fill in by hand: no AI, no cost. */
export async function blankDraftAction(formData: FormData) {
  await requireAdmin();
  const term = cleanTerm(String(formData.get("term") ?? ""));
  if (!term) return back({ error: "That term can't be used." });
  const [stage] = await sql()<{ id: string }[]>`
    select s.id from journey_stages s join journeys j on j.id = s.journey_id where j.active order by s.position desc limit 1`;
  const draft: CategoryDraft = {
    id: `${term.replace(/[^a-z0-9]+/g, "_")}s`.replace(/ss$/, "s"),
    label: term.charAt(0).toUpperCase() + term.slice(1),
    plural: `${term}s`.replace(/ss$/, "s"),
    stage: stage?.id ?? "",
    synonyms: [term],
    taxonomy: [],
    pairs: [],
  };
  await sql()`insert into category_drafts (term, draft) values (${term}, ${sql().json(draft)})`;
  revalidatePath(PAGE);
}

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/** Approves the draft as edited in the form: seeds the category and gives waiting businesses matches. */
export async function approveDraftAction(formData: FormData) {
  await requireAdmin();
  const draftId = Number(formData.get("draft_id"));
  const categories = formData.getAll("pair").map(String);
  const pairs: DraftPair[] = categories.map((c) => ({
    category: c,
    reason_to: String(formData.get(`reason_to_${c}`)),
    reason_from: String(formData.get(`reason_from_${c}`)),
    partnership_type: String(formData.get(`type_${c}`)) as DraftPair["partnership_type"],
    strength: Number(formData.get(`strength_${c}`)),
  }));
  const draft: CategoryDraft = {
    id: String(formData.get("id") ?? "").trim(),
    label: String(formData.get("label") ?? "").trim(),
    plural: String(formData.get("plural") ?? "").trim().toLowerCase(),
    stage: String(formData.get("stage") ?? ""),
    synonyms: list(formData.get("synonyms")),
    taxonomy: list(formData.get("taxonomy")).map((t) => t.replace(/\s+/g, "_")),
    pairs,
  };
  const res = await approveDraft(draftId, draft);
  if (!res.ok) return back({ error: res.error, open: String(draftId) });
  refreshLater(res.placeIds);
  revalidatePath(PAGE);
  back({
    done: `Created “${draft.label}”.${res.placeIds.length ? ` ${res.placeIds.length} waiting business(es) assigned; their matches are refreshing.` : ""}${
      draft.taxonomy.length ? " Map businesses arrive with each metro's next Overture import, then its matches job." : ""
    }`,
  });
}

export async function rejectDraftAction(formData: FormData) {
  await requireAdmin();
  await rejectDraft(Number(formData.get("draft_id")));
  revalidatePath(PAGE);
}
