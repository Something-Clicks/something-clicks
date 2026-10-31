import { activeJourneys } from "@/content/journeys";

/**
 * Prompts. Kept stable (no dates or ids) so they can be cached, and strict
 * about honesty: the model only ever sees public listing fields.
 */

export function reviewSystem(): string {
  const cats = activeJourneys().flatMap((j) => j.categories.map((c) => `- ${c.id}: ${c.label}${c.broad ? " (broad: only some serve weddings)" : ""}`));
  return [
    "You check public business listings for a network of wedding businesses.",
    "For each listing you get its name, the category we assigned, its map-data category, its website domain and its city.",
    "",
    "Decide whether it serves weddings as a normal part of its business:",
    "- yes: weddings are a regular part of what it sells (a bakery that makes wedding cakes, a salon that does bridal hair, a venue that hosts receptions).",
    "- no: weddings are incidental or unrelated (party-supply or craft chains, convenience and grocery stores, car repair, a salon that only does everyday cuts).",
    "- unsure: the listing doesn't tell you enough. Prefer unsure over a guess.",
    "",
    "Also check the category. Suggest a different category id only when the assigned one is clearly wrong and another fits; otherwise answer \"unchanged\".",
    "",
    "Categories:",
    ...cats,
    "",
    "Use only the information given. Don't assume facts about a specific business that aren't in its listing; chain names are fine to recognise.",
    "confidence is your certainty from 0 to 1. reason is at most 15 words.",
    "Return one result per listing, with its id.",
  ].join("\n");
}

export function rationaleSystem(): string {
  return [
    "You write the one-line reason a wedding business sees next to a suggested partner on Something Clicks.",
    "The reader owns business A. Business B is the suggested partner. Write to A as \"you\" and call B by name.",
    "",
    "Say why the two fit: how their work connects for the same couples (what A does, what B does, when in the wedding each happens) and, if useful, that B is nearby.",
    "",
    "Rules:",
    "- One sentence, at most 18 words, plain and specific. No exclamation marks, no emoji.",
    "- Use only the facts given: names, categories, cities, distance.",
    "- Never say or imply B knows A, has worked with A, wants to connect, is interested, is waiting, has joined, is a member, or recommends anything.",
    "- Never invent reviews, awards, prices or specialties.",
    "Return one result per pair, with its key.",
  ].join("\n");
}

/** Phrases a reason must never contain, whatever the model writes. Checked before anything is saved. */
const BANNED = /\b(member|members|joined|waiting|wants to|interested|excited|already (work|know)|worked with|know you|recommend|award|best in|#1|top-rated|guarantee)\b|!|\p{Extended_Pictographic}/iu;

export function acceptableRationale(s: string): boolean {
  const t = s.trim();
  return t.length >= 15 && t.length <= 160 && !BANNED.test(t) && t.split(/\s+/).length <= 24;
}

/** The reason keys a pairing can use; their wording is in journeys.json. */
export const REASON_KEYS = ["hub_planner", "hub_venue", "hub_vendor", "day_of", "moment_before", "moment_after", "same_couple"] as const;

export function categoryDraftSystem(): string {
  const reasons = activeJourneys()[0]?.reasons ?? {};
  return [
    "You help add a new business category to a network of wedding businesses that refer couples to each other.",
    "You get a term people typed for their business (it matched no category), the journey stages, and the existing categories.",
    "",
    "Draft the new category:",
    "- id: lowercase plural with underscores, like wedding_officiants. label: singular, like Wedding officiant. plural: lowercase, like wedding officiants.",
    "- stage: the stage id when couples usually book it.",
    "- synonyms: 3 to 8 lowercase words or phrases a business owner would type for it.",
    "- taxonomy: Overture Maps places category values (taxonomy.primary, lowercase with underscores) that this kind of business is listed under. Include only values you are confident exist; an empty list is fine.",
    "- pairs: the existing categories it fits with. For each: reason_to is why the existing category fits the new one (from the new business's point of view); reason_from is why the new one fits the existing category. partnership_type is the best way for them to work together. strength from 0.6 (same couples) to 1 (planners and venues for vendors).",
    "",
    "Reason keys and their wording:",
    ...REASON_KEYS.map((k) => `- ${k}: ${reasons[k] ?? ""}`),
    "Use hub_planner or hub_venue only when the existing category is planners or venues; hub_vendor only for the reverse direction from a planner or venue.",
    "",
    "Partnership types: referral (send each other couples), joint_offer (a shared package), distribution (promote each other).",
    "If the term isn't a wedding business at all, still answer, and say so in notes. notes is at most 30 words.",
  ].join("\n");
}
