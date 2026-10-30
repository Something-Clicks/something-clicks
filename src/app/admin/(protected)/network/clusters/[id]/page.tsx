import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { ClusterForm } from "@/components/admin/ClusterForm";
import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { dbConfigured } from "@/lib/db";
import { getCluster, listClusters, listJourneys } from "@/lib/network/admin";
import { recomputeAction } from "../../actions";

export default async function ClusterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; recomputed?: string }>;
}) {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [cluster, journeys, all] = await Promise.all([getCluster(id), listJourneys(), listClusters()]);
  if (!cluster) notFound();
  const stats = all.find((c) => c.id === id)!;
  const { saved, recomputed } = await searchParams;
  return (
    <>
      <NetworkNav active="/admin/network" />
      <h1 className="text-3xl">{cluster.name}</h1>
      {(saved || recomputed) && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-lg bg-[#e7f6ee] p-3 text-sm text-success">
          <CircleCheck aria-hidden="true" className="h-4 w-4" />
          {recomputed ? `Matches recomputed: ${Number(recomputed).toLocaleString()} suggestions.` : "Saved."}
        </p>
      )}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <ClusterForm cluster={cluster} journeys={journeys} />
        <aside className="space-y-4">
          <div className="rounded-2xl bg-white p-5 text-sm ring-1 ring-line">
            <h2 className="font-semibold">Businesses</h2>
            <dl className="mt-2 space-y-1">
              {([["Not on Something Clicks yet", stats.listed], ["Claimed", stats.claimed], ["Verified", stats.verified],
                 ["Members", stats.member], ["Stale (missing from latest release)", stats.stale]] as const).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt>{k}</dt><dd className="tabular-nums">{v.toLocaleString()}</dd></div>
              ))}
            </dl>
          </div>
          <form action={recomputeAction} className="rounded-2xl bg-white p-5 text-sm ring-1 ring-line">
            <h2 className="font-semibold">Matches</h2>
            <p className="mt-1 text-navy-soft">
              {stats.matches.toLocaleString()} suggestions · {stats.approved} approved · {stats.hidden} hidden. Recomputing keeps
              approved and hidden decisions.
            </p>
            <input type="hidden" name="cluster_id" value={id} />
            <button type="submit" className="mt-3 w-full rounded-lg bg-navy px-4 py-2 font-semibold text-white">Recompute matches</button>
            <Link href={`/admin/network/explorer?cluster=${id}`} className="mt-3 block text-center font-semibold text-royal hover:underline">
              Open match explorer
            </Link>
          </form>
          <div className="rounded-2xl bg-white p-5 text-sm ring-1 ring-line">
            <h2 className="font-semibold">Import</h2>
            <p className="mt-1 text-navy-soft">
              Run <code>python -m sc_overture import {cluster.slug} --dry-run</code> (or the GitHub Actions workflow), review the report,
              then run it with <code>--load</code>.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
