import Link from "next/link";
import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { dbConfigured } from "@/lib/db";
import { listClusters, listImportRuns } from "@/lib/network/admin";
import { formatDate } from "@/lib/admin-fields";

export default async function NetworkOverview() {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const [clusters, runs] = await Promise.all([listClusters(), listImportRuns(5)]);
  return (
    <>
      <NetworkNav active="/admin/network" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl">Clusters</h1>
        <Link href="/admin/network/clusters/new" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">
          New cluster
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-ice text-left">
            <tr>
              {["Cluster", "Status", "Listed", "Claimed", "Verified", "Members", "Matches", "Approved / hidden"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clusters.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-navy-soft">No clusters yet. Run the seed command.</td></tr>
            )}
            {clusters.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/network/clusters/${c.id}`} className="font-semibold text-navy hover:underline">{c.name}</Link>
                  <div className="text-xs text-navy-soft">
                    {c.slug} · {c.scope === "national" ? "national import" : "metro"} · {c.include_broad ? "imports all categories" : "wedding-specific"}
                    {c.scope === "metro" && (c.match_unconfirmed_broad ? " · matches unconfirmed broad" : " · matches confirmed only")}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize">{c.status}</td>
                {[c.listed, c.claimed, c.verified, c.member, c.matches].map((n, i) => (
                  <td key={i} className="px-4 py-3 tabular-nums">{n.toLocaleString()}</td>
                ))}
                <td className="px-4 py-3 tabular-nums">{c.approved} / {c.hidden}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-navy-soft">
        Introductions requested and accepted, and partnerships live, appear here once member accounts ship (phase 2).
      </p>

      <h2 className="mt-10 text-xl">Recent imports</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {runs.map((r) => (
          <li key={r.id} className="rounded-xl bg-white px-4 py-3 ring-1 ring-line">
            <span className="font-semibold">#{r.id}</span> {r.kind} {r.mode.replace("_", " ")} · {r.cluster_slug ?? "national"} ·{" "}
            <span className={r.status === "succeeded" ? "text-success" : r.status === "running" ? "" : "text-danger"}>{r.status}</span> ·{" "}
            {formatDate(r.started_at.toISOString())} · {r.message}
          </li>
        ))}
      </ul>
      <Link href="/admin/network/imports" className="mt-3 inline-block text-sm font-semibold text-navy hover:underline">All imports</Link>
    </>
  );
}
