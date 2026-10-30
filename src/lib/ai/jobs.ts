import { categoryById } from "@/content/journeys";
import { sql } from "@/lib/db";
import { websiteDomain } from "@/lib/members/domains";
import { costUsd, monthlyCap, withinCap, worstCaseUsd } from "./pricing";
import { rationaleSystem, reviewSystem, acceptableRationale } from "./prompts";
import { standardWhy, type AiProvider, type RationaleItem, type ReviewItem, type ReviewResult } from "./provider";

export const REVIEW_BATCH = 25;
export const RATIONALE_BATCH = 25;
/** Below this, a review is kept for reference but changes nothing. */
export const APPLY_CONFIDENCE = 0.8;
/** Rationales go to each business's strongest matches first. */
export const RATIONALES_PER_PLACE = 5;

/** This month's real spend (mock runs excluded). */
export async function monthSpend(): Promise<number> {
  const [row] = await sql()<{ usd: number }[]>`
    select coalesce(sum(cost_usd), 0)::float as usd from ai_usage
    where not mocked and created_at >= date_trunc('month', now())`;
  return row.usd;
}

/**
 * What a review may change. Only a confident yes/no on a listing nobody has
 * classified sets serves_journey; category moves are suggestions for an admin.
 */
export function decideReview(r: Pick<ReviewResult, "serves" | "confidence">, place: { serves_journey: boolean | null; classified_by: string; state: string }) {
  const locked = place.serves_journey !== null || place.classified_by === "owner" || place.classified_by === "admin" || place.state !== "listed";
  if (locked || r.serves === "unsure" || r.confidence < APPLY_CONFIDENCE) return { apply: false as const };
  return { apply: true as const, serves_journey: r.serves === "yes" };
}

type Candidate = ReviewItem & { serves_journey: boolean | null; classified_by: string; state: string };

/**
 * Listings to review, in active metros: broad categories nobody has confirmed,
 * then wedding-specific ones classified only by name or with low map confidence.
 */
export async function reviewCandidates(limit: number, clusterId?: number): Promise<Candidate[]> {
  const db = sql();
  const rows = await db<(Omit<Candidate, "domain" | "city"> & { website: string; locality: string; region: string })[]>`
    select p.id::int, p.name, p.category_id, coalesce(p.taxonomy_primary, '') as taxonomy, p.website, p.locality, p.region,
           p.serves_journey, p.classified_by, p.state::text as state
    from places p join categories c on c.id = p.category_id
    where not p.suppressed and not p.stale and p.state = 'listed' and p.serves_journey is null
      and p.classified_by not in ('owner', 'admin', 'ai')
      and not exists (select 1 from ai_reviews r where r.place_id = p.id)
      and (c.broad or p.classified_by = 'name_rule' or p.confidence < 0.75)
      and exists (select 1 from clusters cl where cl.scope = 'metro' and cl.status = 'active' and st_intersects(p.geog, cluster_box(cl))
                  ${clusterId ? db`and cl.id = ${clusterId}` : db``})
    order by c.broad desc, p.id
    limit ${limit}`;
  return rows.map((r) => ({ ...r, domain: websiteDomain(r.website) ?? "", city: [r.locality, r.region].filter(Boolean).join(", ") }));
}

export async function queueSizes() {
  const [row] = await sql()<{ review: number; rationale: number }[]>`
    select
      (select count(*)::int from places p join categories c on c.id = p.category_id
        where not p.suppressed and not p.stale and p.state = 'listed' and p.serves_journey is null
          and p.classified_by not in ('owner', 'admin', 'ai')
          and not exists (select 1 from ai_reviews r where r.place_id = p.id)
          and (c.broad or p.classified_by = 'name_rule' or p.confidence < 0.75)
          and exists (select 1 from clusters cl where cl.scope = 'metro' and cl.status = 'active' and st_intersects(p.geog, cluster_box(cl)))) as review,
      (select count(*)::int from (
         select m.place_a, m.ai_rationale, m.place_b, row_number() over (partition by m.place_a order by m.score desc) as rn
         from matches m where m.status <> 'hidden' and not m.rationale_edited) r
       join places a on a.id = r.place_a join places b on b.id = r.place_b
       where r.ai_rationale is null and not a.suppressed and not b.suppressed and not b.stale
         and (a.state <> 'listed' or r.rn <= ${RATIONALES_PER_PLACE})) as rationale`;
  return row;
}

export type RunResult = { requests: number; items: number; applied: number; costUsd: number; stopped?: string };

async function record(kind: "review" | "rationale", provider: AiProvider, items: number, usage: { input_tokens: number; output_tokens: number }) {
  const cost = provider.mocked ? 0 : costUsd(usage);
  await sql()`
    insert into ai_usage (kind, model, items, input_tokens, output_tokens, cost_usd, mocked)
    values (${kind}, ${provider.name}, ${items}, ${usage.input_tokens}, ${usage.output_tokens}, ${cost}, ${provider.mocked})`;
  return cost;
}

/** Reviews up to `limit` listings in batches. Stops before any request that could pass the monthly cap. */
export async function runReview(provider: AiProvider, limit: number, cap = monthlyCap(), clusterId?: number): Promise<RunResult> {
  const out: RunResult = { requests: 0, items: 0, applied: 0, costUsd: 0 };
  const candidates = await reviewCandidates(limit, clusterId);
  const system = reviewSystem();
  for (let i = 0; i < candidates.length; i += REVIEW_BATCH) {
    const batch = candidates.slice(i, i + REVIEW_BATCH);
    const items: ReviewItem[] = batch.map(({ id, name, category_id, taxonomy, domain, city }) => ({ id, name, category_id, taxonomy, domain, city }));
    if (!provider.mocked && !withinCap(await monthSpend(), worstCaseUsd(system.length + JSON.stringify(items).length), cap)) {
      out.stopped = "Monthly AI cap reached.";
      break;
    }
    const res = await provider.review(items);
    out.requests++;
    out.costUsd += await record("review", provider, batch.length, res.usage);
    const byId = new Map(batch.map((b) => [b.id, b]));
    for (const r of res.results) {
      const place = byId.get(r.id);
      if (!place) continue; // ignore ids we didn't send
      const suggested = r.category !== "unchanged" && r.category !== place.category_id && categoryById(r.category) ? r.category : null;
      const decision = decideReview(r, place);
      await sql()`
        insert into ai_reviews (place_id, serves, confidence, suggested_category, reason, model, mocked, applied)
        values (${r.id}, ${r.serves}, ${Math.max(0, Math.min(1, r.confidence))}, ${suggested}, ${r.reason.slice(0, 200)}, ${provider.name},
                ${provider.mocked}, ${decision.apply})
        on conflict (place_id) do nothing`;
      if (decision.apply) {
        await sql()`update places set serves_journey = ${decision.serves_journey} where id = ${r.id} and serves_journey is null`;
        out.applied++;
      }
      out.items++;
    }
  }
  return out;
}

type PairRow = { place_a: number; place_b: number; a_name: string; a_cat: string; a_city: string; b_name: string; b_cat: string; b_city: string; distance_m: number; reason_key: string };

/** Matches without a reason: those an owner can see first, then each business's top few. */
export async function rationaleCandidates(limit: number, clusterId?: number): Promise<PairRow[]> {
  const db = sql();
  return db<PairRow[]>`
    with ranked as (
      select m.*, row_number() over (partition by m.place_a order by m.score desc) as rn
      from matches m where m.status <> 'hidden' and not m.rationale_edited ${clusterId ? db`and m.cluster_id = ${clusterId}` : db``}
    )
    select r.place_a::int, r.place_b::int, a.name as a_name, a.category_id as a_cat, a.locality as a_city,
           b.name as b_name, b.category_id as b_cat, b.locality as b_city, r.distance_m, r.reason_key
    from ranked r join places a on a.id = r.place_a join places b on b.id = r.place_b
    where r.ai_rationale is null and not a.suppressed and not b.suppressed and not b.stale
      and (a.state <> 'listed' or r.rn <= ${RATIONALES_PER_PLACE})
    order by (a.state <> 'listed') desc, r.rn, r.score desc
    limit ${limit}`;
}

/** Writes match reasons in batches. Anything that breaks the honesty rules is dropped, and the standard line stays. */
export async function runRationales(provider: AiProvider, limit: number, cap = monthlyCap(), clusterId?: number): Promise<RunResult> {
  const out: RunResult = { requests: 0, items: 0, applied: 0, costUsd: 0 };
  const pairs = await rationaleCandidates(limit, clusterId);
  const system = rationaleSystem();
  for (let i = 0; i < pairs.length; i += RATIONALE_BATCH) {
    const batch = pairs.slice(i, i + RATIONALE_BATCH);
    const items: RationaleItem[] = batch.map((p) => ({
      key: `${p.place_a}-${p.place_b}`,
      a: { name: p.a_name, category: categoryById(p.a_cat)?.label ?? p.a_cat, city: p.a_city },
      b: { name: p.b_name, category: categoryById(p.b_cat)?.label ?? p.b_cat, city: p.b_city },
      miles: Math.round((p.distance_m / 1609.344) * 10) / 10,
      why: standardWhy(p.a_cat, p.reason_key),
    }));
    if (!provider.mocked && !withinCap(await monthSpend(), worstCaseUsd(system.length + JSON.stringify(items).length), cap)) {
      out.stopped = "Monthly AI cap reached.";
      break;
    }
    const res = await provider.rationales(items);
    out.requests++;
    out.costUsd += await record("rationale", provider, batch.length, res.usage);
    const keys = new Set(items.map((x) => x.key));
    for (const r of res.results) {
      out.items++;
      if (!keys.has(r.key) || !acceptableRationale(r.rationale)) continue;
      const [a, b] = r.key.split("-").map(Number);
      const rows = await sql()`
        update matches set ai_rationale = ${r.rationale.trim()}
        where place_a = ${a} and place_b = ${b} and ai_rationale is null and not rationale_edited returning place_a`;
      out.applied += rows.length;
    }
  }
  return out;
}

export type ReviewRow = {
  place_id: number; name: string; category_label: string; locality: string; serves: string; confidence: number;
  suggested_category: string | null; reason: string; applied: boolean; category_accepted: boolean; mocked: boolean;
  serves_journey: boolean | null; created_at: Date;
};

export async function recentReviews(filter: "all" | "suggestions" | "unsure", limit = 30): Promise<ReviewRow[]> {
  const db = sql();
  return db<ReviewRow[]>`
    select r.place_id::int, p.name, coalesce(c.label, '') as category_label, p.locality, r.serves, r.confidence,
           r.suggested_category, r.reason, r.applied, r.category_accepted, r.mocked, p.serves_journey, r.created_at
    from ai_reviews r join places p on p.id = r.place_id left join categories c on c.id = p.category_id
    where ${filter === "suggestions" ? db`r.suggested_category is not null and not r.category_accepted` : filter === "unsure" ? db`not r.applied` : db`true`}
    order by r.created_at desc, r.place_id limit ${limit}`;
}

/** Admin decisions on a review: accept the suggested category, or set serves-weddings by hand. */
export async function acceptCategory(placeId: number) {
  await sql()`
    with r as (update ai_reviews set category_accepted = true where place_id = ${placeId} and suggested_category is not null returning suggested_category)
    update places p set category_id = r.suggested_category, classified_by = 'ai' from r where p.id = ${placeId}`;
}

export async function usageByMonth() {
  return sql()<{ month: string; kind: string; requests: number; items: number; usd: number; mocked: boolean }[]>`
    select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, kind, count(*)::int as requests,
           sum(items)::int as items, sum(cost_usd)::float as usd, mocked
    from ai_usage group by 1, 2, 6 order by 1 desc, 2 limit 24`;
}
