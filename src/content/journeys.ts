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

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Resolves "What does your business do?" to categories: exact label or
 * synonym first, then word overlap. Returns best matches first.
 */
export function resolveCategories(query: string, limit = 5): Category[] {
  const q = normalize(query);
  if (!q) return [];
  const qWords = new Set(q.split(" ").map((w) => w.replace(/s$/, "")));
  const scored: { c: Category; score: number }[] = [];
  for (const j of activeJourneys()) {
    for (const c of j.categories) {
      const terms = [c.label, c.plural, ...c.synonyms].map(normalize);
      let score = 0;
      for (const t of terms) {
        if (t === q) score = Math.max(score, 100);
        else if (t.startsWith(q) || q.startsWith(t)) score = Math.max(score, 60);
        else {
          const tw = t.split(" ").map((w) => w.replace(/s$/, ""));
          const overlap = tw.filter((w) => qWords.has(w)).length;
          if (overlap) score = Math.max(score, 20 + (30 * overlap) / tw.length);
        }
      }
      // Specific categories outrank broad ones on ties.
      if (score > 0) scored.push({ c, score: score - (c.broad ? 5 : 0) });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.c);
}
