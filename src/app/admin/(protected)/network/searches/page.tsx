import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { partnershipLabels, reasonText } from "@/content/journeys";
import { formatDate } from "@/lib/admin-fields";
import { monthSpend } from "@/lib/ai/jobs";
import { monthlyCap } from "@/lib/ai/pricing";
import { REASON_KEYS } from "@/lib/ai/prompts";
import { getProvider } from "@/lib/ai/provider";
import { dbConfigured, sql } from "@/lib/db";
import { listTerms, type CategoryDraft, type TermRow } from "@/lib/network/vocabulary";
import {
  addSynonymAction, approveDraftAction, blankDraftAction, draftAction, ignoreAction, rejectDraftAction, reopenAction,
} from "../searches-actions";

type Search = { done?: string; error?: string };

const btn = "rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-line hover:bg-ice";
const primary = "rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/90";
const field = "rounded-lg border border-field bg-white px-2.5 py-1.5 text-sm";

export default async function SearchesPage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const sp = await searchParams;
  let terms: TermRow[] = [];
  let done: TermRow[] = [];
  let missing = false;
  try {
    [terms, done] = await Promise.all([listTerms("open"), listTerms("done", 50)]);
  } catch {
    missing = true; // the vocabulary migration isn't applied yet
  }
  const categories = await sql()<{ id: string; label: string; journey_id: string }[]>`
    select c.id, c.label, c.journey_id from categories c join journeys j on j.id = c.journey_id where j.active and not c.broad order by c.label`;
  const stages = await sql()<{ id: string; label: string }[]>`
    select s.id, s.label from journey_stages s join journeys j on j.id = s.journey_id where j.active order by s.position`;
  const ai = getProvider();
  const [spent, cap] = ai ? [await monthSpend().catch(() => 0), monthlyCap()] : [0, monthlyCap()];

  return (
    <>
      <NetworkNav active="/admin/network/searches" />
      <h1 className="text-3xl">Unmatched searches</h1>
      <p className="mt-2 max-w-3xl text-sm text-navy-soft">
        What businesses typed in &ldquo;What you do&rdquo; that matched no category, most searched first. Text only: no visitor
        details are kept. &ldquo;Waiting&rdquo; counts businesses added with that term; they get the category, and matches, as soon as you
        map it. Nothing is created automatically.
      </p>
      <p className="mt-1 text-sm text-navy-soft">
        AI drafting: {ai ? `on (${ai.name}). This month $${spent.toFixed(2)} of $${cap.toFixed(2)}.` : "off until ANTHROPIC_API_KEY is set; blank drafts still work."}
      </p>
      {sp.done && <p role="status" className="mt-4 rounded-xl bg-ice px-4 py-3 text-sm">{sp.done}</p>}
      {sp.error && <p role="alert" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-danger ring-1 ring-line">{sp.error}</p>}
      {missing && (
        <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">
          Apply the <code>vocabulary</code> migration first: GitHub → Actions → Overture import → job migrate, mode load.
        </p>
      )}
      {!missing && terms.length === 0 && <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">No unmatched searches yet.</p>}

      <ul className="mt-6 space-y-4">
        {terms.map((t) => (
          <li key={t.term} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl">&ldquo;{t.term}&rdquo;</h2>
              <span className="text-sm text-navy-soft">
                <strong className="text-navy">{t.searches}</strong> search{t.searches === 1 ? "" : "es"}
                {t.waiting > 0 && <> · <strong className="text-navy">{t.waiting}</strong> waiting</>} · last {formatDate(t.last_seen.toISOString())}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={addSynonymAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="term" value={t.term} />
                <label htmlFor={`cat-${t.term}`} className="text-sm">Add as synonym of</label>
                <select id={`cat-${t.term}`} name="category" required defaultValue="" className={field}>
                  <option value="" disabled>Choose…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <button className={primary}>Add synonym</button>
              </form>
              {!t.draft && (
                <>
                  <form action={draftAction}>
                    <input type="hidden" name="term" value={t.term} />
                    <button className={btn} disabled={!ai}>Create category (AI draft)</button>
                  </form>
                  <form action={blankDraftAction}>
                    <input type="hidden" name="term" value={t.term} />
                    <button className={btn}>Blank draft</button>
                  </form>
                </>
              )}
              <form action={ignoreAction}>
                <input type="hidden" name="term" value={t.term} />
                <button className={btn}>Ignore</button>
              </form>
            </div>
            {t.draft && t.draft_id && <DraftForm draftId={t.draft_id} d={t.draft} categories={categories} stages={stages} />}
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <h2 className="mt-10 text-xl">Done</h2>
          <ul className="mt-3 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
            {done.map((t) => (
              <li key={t.term} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                <span>&ldquo;{t.term}&rdquo; · {t.searches} searches</span>
                <span className="flex items-center gap-3 text-navy-soft">
                  {t.status === "ignored" ? "Ignored" : `${t.status === "synonym" ? "Synonym of" : "New category"} ${t.category_id}`}
                  {t.status === "ignored" && (
                    <form action={reopenAction}>
                      <input type="hidden" name="term" value={t.term} />
                      <button className={btn}>Reopen</button>
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function DraftForm({
  draftId, d, categories, stages,
}: { draftId: number; d: CategoryDraft; categories: { id: string; label: string; journey_id: string }[]; stages: { id: string; label: string }[] }) {
  const byCat = new Map(d.pairs.map((p) => [p.category, p]));
  const journeyId = categories[0]?.journey_id ?? "weddings";
  return (
    <form action={approveDraftAction} className="mt-4 space-y-4 rounded-xl bg-cloud p-4">
      <input type="hidden" name="draft_id" value={draftId} />
      <p className="text-sm font-semibold">New category draft{d.notes ? `: ${d.notes}` : ""}. Edit anything, then approve.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">Label<input name="label" defaultValue={d.label} required className={`${field} mt-1 block w-full`} /></label>
        <label className="text-sm">Plural<input name="plural" defaultValue={d.plural} required className={`${field} mt-1 block w-full`} /></label>
        <label className="text-sm">ID<input name="id" defaultValue={d.id} required pattern="[a-z][a-z0-9_]{2,40}" className={`${field} mt-1 block w-full font-mono`} /></label>
        <label className="text-sm">Stage
          <select name="stage" defaultValue={d.stage} className={`${field} mt-1 block w-full`}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">Synonyms (comma-separated)<input name="synonyms" defaultValue={d.synonyms.join(", ")} className={`${field} mt-1 block w-full`} /></label>
      <label className="block text-sm">
        Overture categories (taxonomy.primary, comma-separated): businesses listed under these come in with each metro&rsquo;s next import
        <input name="taxonomy" defaultValue={d.taxonomy.join(", ")} className={`${field} mt-1 block w-full font-mono`} />
      </label>
      <fieldset>
        <legend className="text-sm font-semibold">Pairings: tick the categories it fits with</legend>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-navy-soft">
              <tr><th className="py-1 pr-2">Category</th><th className="pr-2">Why it fits them (they → new)</th><th className="pr-2">Why they fit it (new → they)</th><th className="pr-2">Idea</th><th>Strength</th></tr>
            </thead>
            <tbody>
              {categories.map((c) => {
                const p = byCat.get(c.id);
                return (
                  <tr key={c.id} className="border-t border-line">
                    <td className="py-1.5 pr-2">
                      <label className="flex items-center gap-2"><input type="checkbox" name="pair" value={c.id} defaultChecked={!!p} />{c.label}</label>
                    </td>
                    {(["reason_to", "reason_from"] as const).map((k) => (
                      <td key={k} className="pr-2">
                        <select name={`${k}_${c.id}`} defaultValue={p?.[k] ?? "same_couple"} aria-label={`${c.label} ${k === "reason_to" ? "why it fits them" : "why they fit it"}`} className={field}>
                          {REASON_KEYS.map((r) => <option key={r} value={r}>{reasonText(journeyId, r)}</option>)}
                        </select>
                      </td>
                    ))}
                    <td className="pr-2">
                      <select name={`type_${c.id}`} defaultValue={p?.partnership_type ?? "distribution"} aria-label={`${c.label} idea`} className={field}>
                        {Object.entries(partnershipLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td>
                      <input name={`strength_${c.id}`} type="number" min={0.1} max={1} step={0.1} defaultValue={p?.strength ?? 0.6} aria-label={`${c.label} strength`} className={`${field} w-20`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button className={primary}>Approve and create</button>
        <button formAction={rejectDraftAction} className={btn}>Reject draft</button>
      </div>
    </form>
  );
}
