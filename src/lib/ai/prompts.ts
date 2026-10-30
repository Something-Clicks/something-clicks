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
