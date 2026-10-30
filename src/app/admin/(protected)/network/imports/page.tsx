import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { dbConfigured } from "@/lib/db";
import { formatDate } from "@/lib/admin-fields";
import { listImportRuns } from "@/lib/network/admin";

const mb = (n: number | null) => (n === null ? "—" : `${(n / 1024 ** 2).toFixed(1)} MB`);

export default async function ImportsPage() {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const runs = await listImportRuns(100);
  return (
    <>
      <NetworkNav active="/admin/network/imports" />
      <h1 className="text-3xl">Imports</h1>
      <p className="mt-2 max-w-3xl text-sm text-navy-soft">
        Imports run outside the site, from GitHub Actions (<strong>Overture import</strong> workflow) or the command line:{" "}
        <code>python -m sc_overture import &lt;cluster&gt; --dry-run</code>, then <code>--load</code> after review. Loads that
        would pass the database budget are refused.
      </p>
      <div className="mt-6 space-y-3">
        {runs.map((r) => (
          <details key={r.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-semibold">#{r.id}</span>
              <span>{r.kind === "cluster" ? r.cluster_slug : r.kind === "counts" ? "National counts" : r.kind}</span>
              <span className="rounded-full bg-ice px-2 py-0.5 text-xs font-semibold">{r.mode.replace("_", " ")}</span>
              <span className={r.status === "succeeded" ? "font-semibold text-success" : r.status === "running" ? "" : "font-semibold text-danger"}>
                {r.status}
              </span>
              <span className="text-navy-soft">{formatDate(r.started_at.toISOString())}</span>
              <span className="text-navy-soft">release {r.release ?? "—"}</span>
              <span className="tabular-nums">
                {r.rows_kept?.toLocaleString() ?? "—"} kept of {r.rows_read?.toLocaleString() ?? "—"}
              </span>
            </summary>
            <div className="mt-4 grid gap-6 text-sm md:grid-cols-3">
              <div>
                <h2 className="font-semibold">Dropped</h2>
                <ul className="mt-1 space-y-0.5">
                  {Object.entries(r.dropped).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-4"><span>{k.replace("_", " ")}</span><span className="tabular-nums">{v.toLocaleString()}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="font-semibold">Kept by category</h2>
                <ul className="mt-1 space-y-0.5">
                  {Object.entries(r.by_category).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-4"><span>{k}</span><span className="tabular-nums">{v.toLocaleString()}</span></li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="font-semibold">Size</h2>
                <p className="mt-1">Database before: {mb(r.database_bytes_before)}</p>
                <p>Projected addition: {mb(r.projected_bytes)}</p>
                <p className="mt-2 text-navy-soft">{r.message}</p>
              </div>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
