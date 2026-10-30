import Link from "next/link";
import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { partnershipLabels, reasonText } from "@/content/journeys";
import { formatMiles, stateLabels, type PlaceState } from "@/content/network";
import { dbConfigured } from "@/lib/db";
import { clusterCategories, getPlace, listClusters, placeMatches, searchPlaces } from "@/lib/network/admin";
import { matchRationaleAction, matchStatusAction, servesJourneyAction } from "../actions";

type Search = { cluster?: string; q?: string; category?: string; place?: string };

const input = "mt-1 block w-full rounded-lg border border-field bg-white px-3 py-2 text-sm";

export default async function ExplorerPage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const sp = await searchParams;
  const clusters = (await listClusters()).filter((c) => c.scope === "metro");
  const clusterId = Number(sp.cluster) || clusters[0]?.id;
  if (!clusterId) return <p>No clusters yet.</p>;
  const placeId = Number(sp.place) || null;
  const [results, categories, place, matches] = await Promise.all([
    searchPlaces(clusterId, sp.q ?? "", sp.category ?? ""),
    clusterCategories(clusterId),
    placeId ? getPlace(placeId) : null,
    placeId ? placeMatches(placeId) : [],
  ]);
  const qs = (extra: Record<string, string | number | undefined>) =>
    "?" + new URLSearchParams(Object.entries({ cluster: clusterId, q: sp.q, category: sp.category, ...extra })
      .filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])).toString();
  const back = `/admin/network/explorer${qs({ place: placeId ?? undefined })}`;

  return (
    <>
      <NetworkNav active="/admin/network/explorer" />
      <h1 className="text-3xl">Match explorer</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <section aria-label="Find a business">
          <form method="get" className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-line">
            <div>
              <label htmlFor="cluster" className="text-sm font-medium">Cluster</label>
              <select id="cluster" name="cluster" defaultValue={clusterId} className={input}>
                {clusters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="q" className="text-sm font-medium">Business name</label>
              <input id="q" name="q" defaultValue={sp.q} className={input} />
            </div>
            <div>
              <label htmlFor="category" className="text-sm font-medium">Category</label>
              <select id="category" name="category" defaultValue={sp.category ?? ""} className={input}>
                <option value="">All</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label} ({c.n})</option>)}
              </select>
            </div>
            <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">Search</button>
          </form>
          <ul className="mt-4 max-h-[70vh] divide-y divide-line overflow-y-auto rounded-2xl bg-white ring-1 ring-line">
            {results.length === 0 && <li className="p-4 text-sm text-navy-soft">No businesses found.</li>}
            {results.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/network/explorer${qs({ place: r.id })}`} aria-current={r.id === placeId ? "true" : undefined}
                      className="block px-4 py-3 text-sm hover:bg-cloud aria-[current=true]:bg-ice">
                  <span className="font-semibold">{r.name}</span>
                  <span className="block text-xs text-navy-soft">
                    {r.category_label}{r.broad ? " (broad)" : ""} · {r.locality || "—"} · {r.matches} matches
                    {r.classified_by === "name_rule" ? " · by name" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Matches">
          {!place ? (
            <div className="rounded-2xl bg-white p-8 text-center text-navy-soft ring-1 ring-line">Choose a business to see its matches.</div>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-2xl">{place.name}</h2>
                  <Link href={`/admin/network/preview?place=${place.id}`} className="text-sm font-semibold text-royal hover:underline">
                    Preview their match view
                  </Link>
                </div>
                <p className="mt-1 text-sm text-navy-soft">
                  {place.category_label}{place.broad ? " (broad category)" : ""} · {stateLabels[place.state as PlaceState]} ·{" "}
                  {[place.street, place.locality, place.region].filter(Boolean).join(", ")}
                </p>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  <div><dt className="inline text-navy-soft">Website: </dt><dd className="inline break-all">{place.website || "—"}</dd></div>
                  <div><dt className="inline text-navy-soft">Phone: </dt><dd className="inline">{place.phone || "—"}</dd></div>
                  <div><dt className="inline text-navy-soft">Email on file: </dt><dd className="inline">{place.has_email ? "yes" : "no"}</dd></div>
                  <div>
                    <dt className="inline text-navy-soft">Overture: </dt>
                    <dd className="inline">{place.taxonomy_primary ?? "—"} · confidence {place.confidence?.toFixed(2) ?? "—"} · {place.classified_by.replace("_", " ")}</dd>
                  </div>
                  <div className="sm:col-span-2"><dt className="inline text-navy-soft">Sources: </dt><dd className="inline">{place.source_datasets.join(", ")} · release {place.release}</dd></div>
                </dl>
                <form action={servesJourneyAction} className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <input type="hidden" name="place_id" value={place.id} />
                  <input type="hidden" name="back" value={back} />
                  <span>Serves weddings?</span>
                  {(["yes", "no", "unknown"] as const).map((v) => {
                    const current = place.serves_journey === true ? "yes" : place.serves_journey === false ? "no" : "unknown";
                    return (
                      <button key={v} name="value" value={v} type="submit" aria-pressed={current === v}
                              className="rounded-lg px-3 py-1 font-semibold ring-1 ring-line aria-pressed:bg-royal aria-pressed:text-white">
                        {v}
                      </button>
                    );
                  })}
                  <span className="text-xs text-navy-soft">
                    &ldquo;No&rdquo; removes a miscategorized business from matching; broad-category businesses score higher once
                    &ldquo;yes&rdquo;. Recompute the cluster after changes.
                  </span>
                </form>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
                <table className="w-full min-w-[880px] text-sm">
                  <caption className="sr-only">Matches for {place.name}</caption>
                  <thead className="bg-ice text-left">
                    <tr>
                      {["Match", "Distance", "Score (C / D / S)", "Partnership", "Reason", "Status"].map((h) => (
                        <th key={h} scope="col" className="px-3 py-3 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matches.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-navy-soft">No matches. Recompute the cluster.</td></tr>}
                    {matches.map((m) => (
                      <tr key={m.place_b} className={`border-t border-line align-top ${m.status === "hidden" ? "opacity-60" : ""}`}>
                        <td className="px-3 py-3">
                          <Link href={`/admin/network/explorer${qs({ place: m.place_b })}`} className="font-semibold text-royal hover:underline">{m.name}</Link>
                          <div className="text-xs text-navy-soft">
                            {m.category_label}{m.broad ? " (broad)" : ""} · {stateLabels[m.state as PlaceState]}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatMiles(m.distance_m)}</td>
                        <td className="whitespace-nowrap px-3 py-3 tabular-nums">
                          <strong>{m.score.toFixed(2)}</strong>{" "}
                          <span className="text-navy-soft">({m.c.toFixed(2)} / {m.d.toFixed(2)} / {m.s.toFixed(2)})</span>
                        </td>
                        <td className="px-3 py-3">{partnershipLabels[m.partnership_type as keyof typeof partnershipLabels]}</td>
                        <td className="px-3 py-3">
                          <form action={matchRationaleAction} className="flex gap-2">
                            <input type="hidden" name="place_a" value={place.id} />
                            <input type="hidden" name="place_b" value={m.place_b} />
                            <input type="hidden" name="back" value={back} />
                            <label className="sr-only" htmlFor={`r-${m.place_b}`}>Reason for {m.name}</label>
                            <input id={`r-${m.place_b}`} name="rationale" maxLength={300}
                                   defaultValue={m.ai_rationale ?? ""} placeholder={reasonText(place.journey_id, m.reason_key)}
                                   className="w-64 rounded-md border border-field px-2 py-1 text-sm" />
                            <button type="submit" className="text-xs font-semibold text-royal">Save</button>
                          </form>
                          {m.rationale_edited && <span className="text-xs text-navy-soft">Edited</span>}
                        </td>
                        <td className="px-3 py-3">
                          <form action={matchStatusAction} className="flex flex-wrap gap-1">
                            <input type="hidden" name="place_a" value={place.id} />
                            <input type="hidden" name="place_b" value={m.place_b} />
                            <input type="hidden" name="back" value={back} />
                            {(["approved", "hidden", "suggested"] as const).map((s) => (
                              <button key={s} name="status" value={s} type="submit" aria-pressed={m.status === s}
                                      disabled={!["suggested", "approved", "hidden"].includes(m.status)}
                                      className="rounded-md px-2 py-1 text-xs font-semibold capitalize ring-1 ring-line aria-pressed:bg-royal aria-pressed:text-white disabled:opacity-50">
                                {s === "suggested" ? "reset" : s === "approved" ? "approve" : "hide"}
                              </button>
                            ))}
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-navy-soft">
                Score = 0.5 × complement + 0.3 × distance + 0.2 × service overlap. Leave the reason blank to use the standard line
                (shown in grey).
              </p>
            </>
          )}
        </section>
      </div>
    </>
  );
}
