import { normalize, staticVocabulary, type VocabEntry } from "@/content/journeys";
import type { TransactionSql } from "postgres";
import { REASON_KEYS } from "@/lib/ai/prompts";
import { dbConfigured, sql } from "@/lib/db";

/**
 * The live vocabulary: the journey map plus what admins have added (synonyms
 * and custom categories). Cached briefly; falls back to the journey map when
 * the database or the vocabulary migration isn't there.
 */
const TTL_MS = 60_000;
const g = globalThis as unknown as { __scVocab?: { at: number; value: VocabEntry[] } };

export async function liveVocabulary(): Promise<VocabEntry[]> {
  if (!dbConfigured()) return staticVocabulary();
  const hit = g.__scVocab;
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const rows = await sql()<{ id: string; journey_id: string; label: string; plural: string; broad: boolean; synonyms: string[]; extra_synonyms: string[] }[]>`
      select c.id, c.journey_id, c.label, c.plural, c.broad, c.synonyms, c.extra_synonyms
      from categories c join journeys j on j.id = c.journey_id
      where j.active
      order by c.id`;
    const value = rows.length
      ? rows.map((r) => ({ id: r.id, journeyId: r.journey_id, label: r.label, plural: r.plural, broad: r.broad, synonyms: [...r.synonyms, ...r.extra_synonyms] }))
      : staticVocabulary();
    g.__scVocab = { at: Date.now(), value };
    return value;
  } catch {
    return staticVocabulary();
  }
}

/** Forget the cached vocabulary after an admin change, so it applies at once on this instance. */
export const resetVocabularyCache = () => {
  g.__scVocab = undefined;
};

/**
 * A search term as we'd store it, or null if it shouldn't be stored: text
 * only, lowercased, and never anything that looks like contact details.
 */
export function cleanTerm(raw: string): string | null {
  const t = normalize(raw);
  if (t.length < 2 || t.length > 60) return null;
  if (/@|https?:|www\.|\.(com|net|org)\b/i.test(raw)) return null;
  if (/\d{3,}/.test(t)) return null;
  if (t.split(" ").length > 6) return null;
  return t;
}

/** Counts a "What you do" term that matched nothing. Best effort: search never fails because of it. */
export async function logUnmatched(raw: string): Promise<void> {
  const term = cleanTerm(raw);
  if (!term || !dbConfigured()) return;
  try {
    await sql()`
      insert into search_terms (term) values (${term})
      on conflict (term) do update set searches = search_terms.searches + 1, last_seen = now()`;
  } catch (error) {
    console.warn("[vocabulary] couldn't log a search term", error instanceof Error ? error.message : error);
  }
}

/** The category a term was mapped to in admin (as a synonym or a new category), if any. */
export async function mappedCategory(term: string): Promise<string | null> {
  try {
    const [row] = await sql()<{ category_id: string }[]>`
      select category_id from search_terms where term = ${term} and status in ('synonym', 'category') and category_id is not null`;
    return row?.category_id ?? null;
  } catch {
    return null;
  }
}

export type TermRow = {
  term: string;
  searches: number;
  status: string;
  category_id: string | null;
  last_seen: Date;
  /** Businesses added by their owners with this term, waiting for a category. */
  waiting: number;
  draft_id: number | null;
  draft: CategoryDraft | null;
};

export async function listTerms(status: "open" | "done" = "open", limit = 100): Promise<TermRow[]> {
  const open = status === "open";
  return sql()<TermRow[]>`
    select t.term, t.searches, t.status, t.category_id, t.last_seen,
           ((select count(*) from places p where p.unmatched_term = t.term and p.category_id is null)
            + (select count(*) from place_claims pc
               where pc.status = 'pending' and pc.new_business->>'unmatched_term' = t.term
                 and coalesce(pc.new_business->>'category_id', '') = ''))::int as waiting,
           d.id::int as draft_id, d.draft
    from search_terms t
    left join lateral (
      select id, draft from category_drafts where term = t.term and status = 'pending' order by created_at desc limit 1
    ) d on true
    where ${open ? sql()`t.status = 'open'` : sql()`t.status <> 'open'`}
    order by ${open ? sql()`t.searches desc, t.last_seen desc` : sql()`t.last_seen desc`}
    limit ${limit}`;
}

type Tx = TransactionSql;

/**
 * Gives businesses waiting on this term the category: owner-added businesses
 * already approved, and pending "Add your business" claims (so they're created
 * with it). Returns the businesses whose matches need refreshing.
 */
async function assignWaiting(tx: Tx, term: string, categoryId: string): Promise<number[]> {
  const places = await tx<{ id: number }[]>`
    update places set category_id = ${categoryId}, serves_journey = true, classified_by = 'owner', unmatched_term = null
    where unmatched_term = ${term} and category_id is null
    returning id::int`;
  await tx`
    update place_claims set new_business = jsonb_set(new_business, '{category_id}', to_jsonb(${categoryId}::text))
    where status = 'pending' and new_business->>'unmatched_term' = ${term} and coalesce(new_business->>'category_id', '') = ''`;
  return places.map((p) => p.id);
}

/** Matches for these businesses' metros (only metros that have one of them). */
export async function refreshMatchesForPlaces(placeIds: number[]): Promise<void> {
  if (!placeIds.length) return;
  const clusters = await sql()<{ id: number }[]>`
    select distinct cl.id::int from clusters cl join places p on st_intersects(p.geog, cluster_box(cl))
    where p.id = any(${placeIds}::bigint[]) and cl.scope = 'metro' and cl.status = 'active'`;
  for (const { id } of clusters) await sql()`select compute_matches(${id})`;
}

/** "Add as synonym of [category]": applies to search at once and gives waiting businesses the category. */
export async function addSynonym(rawTerm: string, categoryId: string): Promise<{ ok: true; placeIds: number[] } | { ok: false; error: string }> {
  const term = cleanTerm(rawTerm);
  if (!term) return { ok: false, error: "That term can't be used." };
  const result = await sql().begin(async (tx) => {
    const [cat] = await tx<{ id: string }[]>`select id from categories where id = ${categoryId}`;
    if (!cat) return { ok: false as const, error: "Choose a category." };
    await tx`
      update categories set extra_synonyms = array_append(extra_synonyms, ${term})
      where id = ${categoryId} and not (${term} = any(synonyms) or ${term} = any(extra_synonyms))`;
    await tx`
      insert into search_terms (term, searches, status, category_id) values (${term}, 0, 'synonym', ${categoryId})
      on conflict (term) do update set status = 'synonym', category_id = excluded.category_id`;
    return { ok: true as const, placeIds: await assignWaiting(tx, term, categoryId) };
  });
  resetVocabularyCache();
  return result;
}

export async function ignoreTerm(rawTerm: string): Promise<void> {
  const term = cleanTerm(rawTerm);
  if (term) await sql()`update search_terms set status = 'ignored' where term = ${term}`;
}

export async function reopenTerm(rawTerm: string): Promise<void> {
  const term = cleanTerm(rawTerm);
  if (term) await sql()`update search_terms set status = 'open' where term = ${term} and status = 'ignored'`;
}

// ---------------------------------------------------------------------------
// New categories: an AI draft, edited and approved by an admin
// ---------------------------------------------------------------------------

export type DraftPair = {
  /** An existing category. */
  category: string;
  /** Why the existing category fits the new one (a reason key), and the reverse. */
  reason_to: string;
  reason_from: string;
  partnership_type: "referral" | "joint_offer" | "distribution";
  strength: number;
};

export type CategoryDraft = {
  id: string;
  label: string;
  plural: string;
  stage: string;
  synonyms: string[];
  taxonomy: string[];
  pairs: DraftPair[];
  notes?: string;
};

const RELATION: Record<string, string> = {
  hub_planner: "hub", hub_venue: "hub", hub_vendor: "hub", day_of: "day_of", moment_before: "moment", moment_after: "moment", same_couple: "same_couple",
};

/** Checks a draft against the live categories before it can be approved. */
export async function validateDraft(d: CategoryDraft): Promise<string | null> {
  if (!/^[a-z][a-z0-9_]{2,40}$/.test(d.id)) return "The id must be lowercase letters, numbers and underscores.";
  if (!d.label.trim() || !d.plural.trim()) return "Add a label and a plural.";
  const [taken] = await sql()`select 1 from categories where id = ${d.id}`;
  if (taken) return `A category with the id ${d.id} already exists.`;
  const [stage] = await sql()`select 1 from journey_stages where id = ${d.stage}`;
  if (!stage) return "Choose a stage.";
  if (!d.pairs.length) return "Add at least one pairing.";
  const known = new Set((await sql()<{ id: string }[]>`select id from categories where not broad`).map((r) => r.id));
  for (const p of d.pairs) {
    if (!known.has(p.category)) return `Unknown category in pairings: ${p.category}.`;
    if (!REASON_KEYS.includes(p.reason_to as (typeof REASON_KEYS)[number]) || !REASON_KEYS.includes(p.reason_from as (typeof REASON_KEYS)[number])) {
      return `Unknown reason for ${p.category}.`;
    }
    if (!["referral", "joint_offer", "distribution"].includes(p.partnership_type)) return `Unknown partnership type for ${p.category}.`;
    if (!(p.strength > 0 && p.strength <= 1)) return `Strength for ${p.category} must be between 0 and 1.`;
  }
  if (d.taxonomy.some((t) => !/^[a-z][a-z0-9_]*$/.test(t))) return "Overture categories are lowercase with underscores, like wedding_officiant.";
  const clash = await sql()<{ t: string; id: string }[]>`
    select t, c.id from categories c, unnest(c.taxonomy) t where t = any(${d.taxonomy}::text[])`;
  if (clash.length) return `${clash[0].t} is already mapped to ${clash[0].id}.`;
  return null;
}

/**
 * Creates the category from an approved draft: the category (custom), its
 * pairings both ways, the term mapped to it, waiting businesses assigned.
 * Map businesses arrive with the next import of each metro, which now maps
 * the draft's Overture categories too.
 */
export async function approveDraft(draftId: number, d: CategoryDraft): Promise<{ ok: true; placeIds: number[] } | { ok: false; error: string }> {
  const invalid = await validateDraft(d);
  if (invalid) return { ok: false, error: invalid };
  const result = await sql().begin(async (tx) => {
    const [draft] = await tx<{ term: string; journey_id: string }[]>`
      select cd.term, j.id as journey_id from category_drafts cd, journey_stages s join journeys j on j.id = s.journey_id
      where cd.id = ${draftId} and cd.status = 'pending' and s.id = ${d.stage}
      for update of cd`;
    if (!draft) return { ok: false as const, error: "This draft isn't pending." };
    const synonyms = Array.from(new Set([draft.term, ...d.synonyms.map(normalize)].filter(Boolean)));
    await tx`
      insert into categories (id, journey_id, stage_id, label, plural, broad, taxonomy, synonyms, custom)
      values (${d.id}, ${draft.journey_id}, ${d.stage}, ${d.label.trim()}, ${d.plural.trim()}, false, ${d.taxonomy}, ${synonyms}, true)`;
    for (const p of d.pairs) {
      await tx`
        insert into complements (category_a, category_b, strength, relation, reason_key, partnership_type, source)
        values (${d.id}, ${p.category}, ${p.strength}, ${RELATION[p.reason_to]}, ${p.reason_to}, ${p.partnership_type}, 'admin'),
               (${p.category}, ${d.id}, ${p.strength}, ${RELATION[p.reason_from]}, ${p.reason_from}, ${p.partnership_type}, 'admin')`;
    }
    await tx`update category_drafts set status = 'approved', decided_at = now(), draft = ${tx.json(d)} where id = ${draftId}`;
    await tx`update search_terms set status = 'category', category_id = ${d.id} where term = ${draft.term}`;
    return { ok: true as const, placeIds: await assignWaiting(tx, draft.term, d.id) };
  });
  resetVocabularyCache();
  return result;
}

export async function rejectDraft(draftId: number): Promise<void> {
  await sql()`update category_drafts set status = 'rejected', decided_at = now() where id = ${draftId} and status = 'pending'`;
}
