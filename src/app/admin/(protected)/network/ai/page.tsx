import Link from "next/link";
import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { categoryById } from "@/content/journeys";
import { dbConfigured } from "@/lib/db";
import { APPLY_CONFIDENCE, monthSpend, queueSizes, recentReviews, usageByMonth } from "@/lib/ai/jobs";
import { MODEL, monthlyCap } from "@/lib/ai/pricing";
import { getProvider } from "@/lib/ai/provider";
import { acceptCategoryAction, overrideServesAction, runAiAction } from "../ai-actions";

// Runs make up to 20 requests one after another.
export const maxDuration = 300;

/** Rough per-item costs from typical prompt sizes, to size the whole queue. The cap uses worst cases. */
const TYPICAL_USD = { review: 0.00005, rationale: 0.00004 };

type Search = { done?: string; items?: string; applied?: string; usd?: string; stopped?: string; error?: string; filter?: string };

export default async function AiPage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const sp = await searchParams;
  const filter = sp.filter === "suggestions" || sp.filter === "unsure" ? sp.filter : "all";
  const provider = getProvider();
  const cap = monthlyCap();
  const [spent, queues, reviews, usage] = await Promise.all([monthSpend(), queueSizes(), recentReviews(filter), usageByMonth()]);
  const pct = Math.min(100, (spent / cap) * 100);

  return (
    <>
      <NetworkNav active="/admin/network/ai" />
      <h1 className="text-3xl">AI review</h1>
      <p className="mt-2 max-w-3xl text-sm text-navy-soft">
        {MODEL} checks whether broad-category and possibly miscategorized listings really serve weddings, and writes the one-line
        reason owners see on each match. Nothing runs on its own: each run starts when you press a button, and every request is
        checked against the monthly cap first.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <p className="text-sm text-navy-soft">Status</p>
          <p className={`mt-1 text-xl font-semibold ${provider && !provider.mocked ? "text-success" : ""}`}>
            {!provider ? "Off" : provider.mocked ? "Mock (local only, free)" : `On: ${MODEL}`}
          </p>
          {!provider && <p className="mt-1 text-sm">Add <code>ANTHROPIC_API_KEY</code> in Vercel and Redeploy to turn it on.</p>}
        </div>
        <div className="rounded-2xl bg-white p-5 ring-1 ring-line md:col-span-2">
          <p className="text-sm text-navy-soft">Spend this month</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">${spent.toFixed(2)} of ${cap.toFixed(2)}</p>
          <div className="mt-2 h-2 rounded-full bg-cloud" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Share of monthly cap used">
            <div className={`h-2 rounded-full ${pct > 90 ? "bg-danger" : "bg-royal"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-navy-soft">A request runs only if its worst case (full output) still fits under the cap. Mock runs cost nothing and don&rsquo;t count.</p>
        </div>
      </div>

      {sp.error && <p role="alert" className="mt-4 rounded-lg bg-[#FDECEC] p-3 text-sm font-medium text-danger">{sp.error === "off" ? "AI is off. Add ANTHROPIC_API_KEY first." : sp.error}</p>}
      {sp.done && (
        <p role="status" className="mt-4 rounded-lg bg-ice p-3 text-sm">
          {sp.done === "review" ? "Reviewed" : "Wrote reasons for"} {sp.items} {sp.done === "review" ? "listings" : "matches"};{" "}
          {sp.done === "review" ? `${sp.applied} confident enough to apply` : `${sp.applied} saved`}. Cost ${sp.usd}.
          {sp.stopped && <strong> {sp.stopped}</strong>}
          {sp.done === "review" && Number(sp.applied) > 0 && " Recompute the affected clusters for matches to reflect it."}
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Job
          title="Review listings"
          body={`Broad categories nobody has confirmed, and wedding listings classified only by name or with low map confidence. A confident yes or no (≥ ${APPLY_CONFIDENCE}) updates matching; category changes wait for you below.`}
          queue={queues.review}
          estimate={queues.review * TYPICAL_USD.review}
          cap={cap}
          job="review"
          sizes={[100, 250]}
          disabled={!provider}
        />
        <Job
          title="Write match reasons"
          body={`Matches owners can see come first, then each business's top 5. Reasons that break the honesty rules are thrown away and the standard line stays.`}
          queue={queues.rationale}
          estimate={queues.rationale * TYPICAL_USD.rationale}
          cap={cap}
          job="rationale"
          sizes={[250, 500]}
          disabled={!provider}
        />
      </div>

      <section className="mt-10" aria-labelledby="results-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="results-heading" className="text-2xl">Latest 30 reviews</h2>
          <nav aria-label="Filter reviews" className="flex gap-2 text-sm">
            {(["all", "suggestions", "unsure"] as const).map((f) => (
              <Link key={f} href={`?filter=${f}`} aria-current={filter === f ? "page" : undefined}
                    className="rounded-lg px-3 py-1.5 font-semibold text-royal ring-1 ring-line aria-[current=page]:bg-royal aria-[current=page]:text-white">
                {f === "all" ? "All" : f === "suggestions" ? "Category suggestions" : "Not applied"}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-ice text-left">
              <tr>{["Business", "Verdict", "Reason", "Category", "Serves weddings now"].map((h) => <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody>
              {reviews.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-navy-soft">No reviews yet.</td></tr>}
              {reviews.map((r) => (
                <tr key={r.place_id} className="border-t border-line align-top">
                  <td className="px-3 py-3">
                    <Link href={`/admin/network/explorer?place=${r.place_id}`} className="font-semibold text-royal hover:underline">{r.name}</Link>
                    <div className="text-xs text-navy-soft">{r.category_label} · {r.locality}{r.mocked ? " · mock" : ""}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={`font-semibold ${r.serves === "yes" ? "text-success" : r.serves === "no" ? "text-danger" : "text-navy-soft"}`}>{r.serves}</span>{" "}
                    <span className="tabular-nums text-navy-soft">{r.confidence.toFixed(2)}</span>
                    <div className="text-xs text-navy-soft">{r.applied ? "applied" : "not applied"}</div>
                  </td>
                  <td className="px-3 py-3">{r.reason}</td>
                  <td className="px-3 py-3">
                    {r.suggested_category ? (
                      r.category_accepted ? <span className="text-success">Moved to {categoryById(r.suggested_category)?.label}</span> : (
                        <form action={acceptCategoryAction}>
                          <input type="hidden" name="place_id" value={r.place_id} />
                          <button type="submit" className="rounded-md px-2 py-1 text-xs font-semibold text-royal ring-1 ring-line">
                            Move to {categoryById(r.suggested_category)?.label}
                          </button>
                        </form>
                      )
                    ) : <span className="text-navy-soft">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <form action={overrideServesAction} className="flex gap-1">
                      <input type="hidden" name="place_id" value={r.place_id} />
                      {(["yes", "no", "unknown"] as const).map((v) => {
                        const current = r.serves_journey === true ? "yes" : r.serves_journey === false ? "no" : "unknown";
                        return (
                          <button key={v} name="value" value={v} type="submit" aria-pressed={current === v}
                                  className="rounded-md px-2 py-1 text-xs font-semibold ring-1 ring-line aria-pressed:bg-royal aria-pressed:text-white">{v}</button>
                        );
                      })}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="usage-heading">
        <h2 id="usage-heading" className="text-2xl">Usage</h2>
        <table className="mt-3 w-full max-w-2xl text-sm">
          <thead><tr className="text-left">{["Month", "Job", "Requests", "Items", "Cost"].map((h) => <th key={h} className="py-2">{h}</th>)}</tr></thead>
          <tbody>
            {usage.length === 0 && <tr><td colSpan={5} className="py-3 text-navy-soft">Nothing yet.</td></tr>}
            {usage.map((u) => (
              <tr key={`${u.month}-${u.kind}-${u.mocked}`} className="border-t border-line">
                <td className="py-2">{u.month}</td>
                <td className="py-2">{u.kind}{u.mocked ? " (mock)" : ""}</td>
                <td className="py-2 tabular-nums">{u.requests}</td>
                <td className="py-2 tabular-nums">{u.items.toLocaleString()}</td>
                <td className="py-2 tabular-nums">${u.usd.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function Job(p: { title: string; body: string; queue: number; estimate: number; cap: number; job: string; sizes: number[]; disabled: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <h2 className="text-xl">{p.title}</h2>
      <p className="mt-1 text-sm text-navy-soft">{p.body}</p>
      <p className="mt-3 text-sm">
        <strong className="tabular-nums">{p.queue.toLocaleString()}</strong> waiting · about <strong>${p.estimate.toFixed(2)}</strong> for all of them
      </p>
      {p.estimate > p.cap && <p className="mt-1 text-xs text-navy-soft">More than one month&rsquo;s cap: runs stop at the cap and carry on next month.</p>}
      <form action={runAiAction} className="mt-4 flex flex-wrap gap-2">
        <input type="hidden" name="job" value={p.job} />
        {p.sizes.map((s) => (
          <button key={s} name="size" value={s} type="submit" disabled={p.disabled}
                  className="rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Run {s}
          </button>
        ))}
      </form>
    </div>
  );
}
