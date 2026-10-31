import data from "./journeys.json";

/**
 * Typed access to the journey map in journeys.json, which is shared with
 * the Python import job (scripts/overture). Edit the JSON, not this file.
 */

export type PartnershipType = keyof typeof data.partnershipTypes;

export type Category = {
  id: string;
  journeyId: string;
  stage: string;
  label: string;
  plural: string;
  broad: boolean;
  hub?: "planner" | "venue";
  taxonomy: string[];
  synonyms: string[];
  nameRule?: string;
};

export type Journey = {
  id: string;
  name: string;
  active: boolean;
  noun: string;
  stages: { id: string; label: string }[];
  categories: Category[];
  reasons: Record<string, string>;
};

export const journeys: Journey[] = data.journeys.map((j) => ({
  id: j.id,
  name: j.name,
  active: j.active,
  noun: j.noun,
  stages: j.stages,
  reasons: j.reasons,
  categories: j.categories.map((c) => ({
    id: c.id,
    journeyId: j.id,
    stage: c.stage,
    label: c.label,
    plural: c.plural,
    broad: "broad" in c ? Boolean(c.broad) : false,
    hub: "hub" in c ? (c.hub as Category["hub"]) : undefined,
    taxonomy: c.taxonomy,
    synonyms: c.synonyms,
    nameRule: "nameRule" in c ? (c.nameRule as string) : undefined,
  })),
}));

export const partnershipLabels = data.partnershipTypes;

const categoryIndex = new Map(journeys.flatMap((j) => j.categories.map((c) => [c.id, c] as const)));

export const categoryById = (id: string) => categoryIndex.get(id);

export const activeJourneys = () => journeys.filter((j) => j.active);

export function reasonText(journeyId: string, key: string): string {
  return journeys.find((j) => j.id === journeyId)?.reasons[key] ?? "";
}

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * What the matcher searches: every category with its label, plural and
 * synonyms. Admin-added synonyms and categories (from the database) are
 * appended to the journey map's own by liveVocabulary() on the server.
 */
export type VocabEntry = { id: string; journeyId: string; label: string; plural: string; broad: boolean; synonyms: string[] };

export const staticVocabulary = (): VocabEntry[] =>
  activeJourneys().flatMap((j) =>
    j.categories.map((c) => ({ id: c.id, journeyId: j.id, label: c.label, plural: c.plural, broad: c.broad, synonyms: c.synonyms })),
  );

/** Words that say nothing about what a business does: "wedding officiant" must not match on "wedding". */
const GENERIC = new Set(
  "wedding weddings event events party parties and or the a an of for in we do our my your services service company business co llc inc shop shops studio studios pro professional local".split(" "),
);
const stem = (w: string) => w.replace(/s$/, "");
const meaningful = (s: string) => s.split(" ").map(stem).filter((w) => w.length > 1 && !GENERIC.has(w) && !GENERIC.has(`${w}s`));

/** Ranked categories for what a business typed: exact label or synonym first, then a meaningful word in common. */
export function matchVocabulary(query: string, vocab: VocabEntry[], limit = 5): VocabEntry[] {
  const q = normalize(query);
  if (!q) return [];
  const qWords = new Set(meaningful(q));
  const scored: { v: VocabEntry; score: number }[] = [];
  for (const v of vocab) {
    const terms = [v.label, v.plural, ...v.synonyms].map(normalize);
    let score = 0;
    for (const t of terms) {
      if (t === q) score = Math.max(score, 100);
      else if (q.startsWith(`${t} `) || q.endsWith(` ${t}`) || (q.length >= 3 && !GENERIC.has(q) && t.startsWith(q))) score = Math.max(score, 60);
      else {
        const tw = meaningful(t);
        const overlap = tw.filter((w) => qWords.has(w)).length;
        if (overlap) score = Math.max(score, 20 + (30 * overlap) / tw.length);
      }
    }
    // Specific categories outrank broad ones on ties.
    if (score > 0) scored.push({ v, score: score - (v.broad ? 5 : 0) });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.v);
}

/**
 * Resolves "What does your business do?" to categories from the journey map
 * alone. The live site uses matchVocabulary() with liveVocabulary(), which
 * adds what admins have added.
 */
export function resolveCategories(query: string, limit = 5): Category[] {
  return matchVocabulary(query, staticVocabulary(), limit).flatMap((v) => categoryById(v.id) ?? []);
}

export type Suggestion = { entry: VocabEntry; /** The synonym that matched, when it isn't the label: "photo booth". */ via?: string };

/** Type-ahead: categories whose label or a synonym starts with (or contains a word starting with) what's typed. */
export function suggestVocabulary(query: string, vocab: VocabEntry[], limit = 6): Suggestion[] {
  const q = normalize(query);
  if (!q) return [];
  const out: (Suggestion & { score: number })[] = [];
  for (const v of vocab) {
    let best: { score: number; term: string } | null = null;
    for (const term of [v.label, v.plural, ...v.synonyms]) {
      const t = normalize(term);
      const score = t === q ? 4 : t.startsWith(q) ? 3 : t.split(" ").some((w) => w.startsWith(q)) ? 2 : q.length >= 4 && t.includes(q) ? 1 : 0;
      if (score && (!best || score > best.score)) best = { score, term };
    }
    if (!best) {
      // Whole phrases ("we do wedding catering") still find their category.
      if (matchVocabulary(q, [v], 1).length) best = { score: 1, term: v.label };
      else continue;
    }
    const isLabel = [v.label, v.plural].map(normalize).includes(normalize(best.term));
    out.push({ entry: v, via: isLabel ? undefined : best.term, score: best.score - (v.broad ? 0.5 : 0) });
  }
  return out
    .sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label))
    .slice(0, limit)
    .map(({ entry, via }) => ({ entry, via }));
}

const bigrams = (s: string) => {
  const t = ` ${s} `;
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
};

/** Sørensen–Dice similarity of two strings' letter pairs: 1 for identical, 0 for nothing in common. */
function similarity(a: string, b: string) {
  const x = bigrams(a);
  const y = bigrams(b);
  const counts = new Map<string, number>();
  for (const g of y) counts.set(g, (counts.get(g) ?? 0) + 1);
  let shared = 0;
  for (const g of x) {
    const n = counts.get(g) ?? 0;
    if (n > 0) {
      shared++;
      counts.set(g, n - 1);
    }
  }
  return (2 * shared) / (x.length + y.length);
}

/** "Did you mean…?": wedding-specific categories spelled closest to what was typed, if any are close. */
export function closestVocabulary(query: string, vocab: VocabEntry[], limit = 3, threshold = 0.45): VocabEntry[] {
  // Compare only the words that say what a business does: "wedding officiant" isn't close to "wedding video".
  const core = (s: string) => meaningful(normalize(s)).join(" ") || normalize(s);
  const q = core(query);
  if (q.length < 3) return [];
  return vocab
    .filter((v) => !v.broad)
    .map((v) => ({ v, score: Math.max(...[v.label, v.plural, ...v.synonyms].map((t) => similarity(q, core(t)))) }))
    .filter((s) => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.v);
}

/** URL slug for a category: "wedding_planners" -> "wedding-planners". */
export const categorySlug = (id: string) => id.replace(/_/g, "-");

export const categoryBySlug = (slug: string) => categoryById(slug.replace(/-/g, "_"));
