import type { Metadata } from "next";
import { DashboardShell } from "@/components/members/DashboardShell";
import { NoBusiness } from "@/components/members/NoBusiness";
import { SOURCES, sourceLabels } from "@/lib/couples/config";
import { resultsFor, type Results } from "@/lib/couples/inquiries";
import { loadDashboard } from "@/lib/members/dashboard";
import { readiness } from "@/lib/readiness";

export const metadata: Metadata = { title: "Results", robots: { index: false } };

type Search = { place?: string };

const campaignLabels: Record<string, string> = { new: "Booked in", in_progress: "In progress", done: "Done", cancelled: "Cancelled" };

export default async function ResultsPage({ searchParams }: { searchParams: Promise<Search> }) {
  // The layout shows "coming soon" until accounts are live; don't query tables that may not exist yet.
  if (!(await readiness()).members) return null;
  const sp = await searchParams;
  const ctx = await loadDashboard("/dashboard/results", sp.place);
  if (ctx.kind === "none") return <NoBusiness email={ctx.member.email} pending={ctx.pending} />;
  const r: Results | null = await resultsFor(ctx.place.id).catch(() => null);
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  return (
    <DashboardShell active="/dashboard/results" place={ctx.place} places={ctx.places} incoming={ctx.incoming}>
      <h2 className="text-2xl">Results</h2>
      <p className="mt-1 text-navy-soft">The last {r?.days ?? 30} days. Counts only: no visitor details are recorded.</p>
      {!r ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">Results aren&rsquo;t available yet.</p>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Profile views" value={sum(r.views)} />
            <Stat label="Inquiries" value={sum(r.inquiries)} sub={r.booked ? `${r.booked} marked booked` : undefined} />
            <Stat label="Partner link visits" value={r.referralVisits} sub="All time, from your tracking links" />
            <Stat label="Live partnerships" value={r.livePartnerships} />
          </ul>
          <div className="mt-8 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <caption className="px-5 pt-5 text-left text-lg font-semibold">By source</caption>
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-5 py-3 font-semibold">Source</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Profile views</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Inquiries</th>
                </tr>
              </thead>
              <tbody>
                {SOURCES.map((s) => (
                  <tr key={s} className="border-b border-line last:border-0">
                    <th scope="row" className="px-5 py-3 font-normal">{sourceLabels[s]}</th>
                    <td className="px-5 py-3 text-right tabular-nums">{r.views[s]}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{r.inquiries[s]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.campaigns.length > 0 && (
            <div className="mt-8 rounded-2xl bg-white p-5 ring-1 ring-line">
              <h3 className="text-lg font-semibold">Managed campaigns</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {r.campaigns.map((c) => <li key={c.status}>{campaignLabels[c.status] ?? c.status}: {c.n}</li>)}
              </ul>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <li className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <p className="text-sm font-medium text-navy-soft">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value.toLocaleString("en-US")}</p>
      {sub && <p className="mt-1 text-xs text-navy-soft">{sub}</p>}
    </li>
  );
}
