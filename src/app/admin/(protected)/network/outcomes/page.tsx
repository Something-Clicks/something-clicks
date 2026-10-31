import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { dbConfigured } from "@/lib/db";
import { claimsByCity, clusterOutcomes, type ClusterOutcome } from "@/lib/network/outcomes";

const cols: { key: keyof ClusterOutcome; label: string; hint?: string }[] = [
  { key: "listed", label: "Businesses", hint: "Wedding businesses in the network's matching (broad ones once confirmed)" },
  { key: "claimed", label: "Claimed", hint: "Waiting for review" },
  { key: "verified", label: "Verified" },
  { key: "members", label: "Members" },
  { key: "requested", label: "Intros requested" },
  { key: "requested_30d", label: "Last 30 days" },
  { key: "connected", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "partnerships_proposed", label: "Partnerships proposed" },
  { key: "partnerships_live", label: "Partnerships live" },
  { key: "clicks", label: "Link visits" },
];

export default async function OutcomesPage() {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const [rows, cities] = await Promise.all([clusterOutcomes(), claimsByCity()]);
  const total = Object.fromEntries(cols.map((c) => [c.key, rows.reduce((s, r) => s + (r[c.key] as number), 0)])) as Record<string, number>;
  const rate = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <>
      <NetworkNav active="/admin/network/outcomes" />
      <h1 className="text-3xl">Outcomes</h1>
      <p className="mt-2 max-w-3xl text-sm text-navy-soft">
        Live counts per metro. Introductions and partnerships count toward the metro of the business that asked.
      </p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Members", total.members.toLocaleString(), `${(total.verified + total.members).toLocaleString()} verified in all`],
          ["Introductions accepted", total.connected.toLocaleString(), `${rate(total.connected, total.requested)} of ${total.requested} requested`],
          ["Partnerships live", total.partnerships_live.toLocaleString(), `${total.partnerships_proposed} more proposed`],
          ["Tracking-link visits", total.clicks.toLocaleString(), "Across all live partnerships"],
        ].map(([label, value, sub]) => (
          <div key={label} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <dt className="text-sm text-navy-soft">{label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{value}</dd>
            <dd className="mt-1 text-xs text-navy-soft">{sub}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[1000px] text-sm">
          <caption className="sr-only">Outcomes by metro</caption>
          <thead className="bg-ice text-left">
            <tr>
              <th scope="col" className="px-3 py-3 font-semibold">Metro</th>
              {cols.map((c) => <th key={c.key} scope="col" title={c.hint} className="px-3 py-3 text-right font-semibold">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-line">
                <th scope="row" className="px-3 py-3 text-left font-semibold">{r.name}</th>
                {cols.map((c) => <td key={c.key} className="px-3 py-3 text-right tabular-nums">{(r[c.key] as number).toLocaleString()}</td>)}
              </tr>
            ))}
            <tr className="border-t-2 border-line bg-cloud font-semibold">
              <th scope="row" className="px-3 py-3 text-left">All metros</th>
              {cols.map((c) => <td key={c.key} className="px-3 py-3 text-right tabular-nums">{total[c.key].toLocaleString()}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <section className="mt-10" aria-labelledby="cities-heading">
        <h2 id="cities-heading" className="text-2xl">Claims by city</h2>
        <p className="mt-1 text-sm text-navy-soft">Pending and verified claims. Cities outside the five metros come first: that&rsquo;s demand for the next metro.</p>
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="sr-only">Claims by city</caption>
            <thead className="bg-ice text-left">
              <tr>
                <th scope="col" className="px-3 py-3 font-semibold">City</th>
                <th scope="col" className="px-3 py-3 font-semibold">Area</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Claims</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Verified</th>
                <th scope="col" className="px-3 py-3 text-right font-semibold">Pending</th>
              </tr>
            </thead>
            <tbody>
              {cities.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-navy-soft">No claims yet.</td></tr>}
              {cities.map((c) => (
                <tr key={`${c.city}-${c.region}-${c.in_metro}`} className="border-t border-line">
                  <th scope="row" className="px-3 py-3 text-left font-semibold">{[c.city || "Unknown", c.region].filter(Boolean).join(", ")}</th>
                  <td className="px-3 py-3">{c.in_metro ? "In a launch metro" : <strong className="text-royal">Outside the metros</strong>}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.claims}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.verified}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
