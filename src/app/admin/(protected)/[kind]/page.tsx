import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { categories, serviceAreas } from "@/content/options";
import { formatDate, isKind, kindMeta, pickFilters } from "@/lib/admin-fields";
import { getStore } from "@/lib/store";

type Search = Record<string, string | undefined>;

const selectClass = "mt-1 block w-full rounded-lg border border-field bg-white px-3 py-2 text-sm";

export default async function AdminListPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<Search>;
}) {
  const { kind } = await params;
  if (!isKind(kind)) notFound();
  const sp = await searchParams;
  const filters = pickFilters(sp);
  const meta = kindMeta[kind];
  const rows = await getStore().list(kind, filters);
  const exportQuery = new URLSearchParams({ kind, ...(Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) as Record<string, string>) });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">{meta.title}</h1>
          <p className="mt-1 text-sm text-navy-soft" aria-live="polite">
            {rows.length} {rows.length === 1 ? "result" : "results"}
            {rows.length >= 500 && " (showing the most recent 500; narrow the filters or export)"}
          </p>
        </div>
        <a
          href={`/admin/export?${exportQuery}`}
          className="inline-flex items-center gap-2 rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-navy"
        >
          <Download aria-hidden="true" className="h-4 w-4" /> Export CSV
        </a>
      </div>

      <form method="get" className="mt-6 grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-6" role="search" aria-label={`Filter ${meta.title.toLowerCase()}`}>
        <div className="lg:col-span-2">
          <label htmlFor="q" className="text-sm font-medium">Search</label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Name, email…" className={selectClass} />
        </div>
        <div>
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className={selectClass}>
            <option value="">All</option>
            {meta.statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {kind === "applications" && (
          <>
            <div>
              <label htmlFor="category" className="text-sm font-medium">Category</label>
              <select id="category" name="category" defaultValue={filters.category ?? ""} className={selectClass}>
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="service_area" className="text-sm font-medium">Service area</label>
              <select id="service_area" name="service_area" defaultValue={filters.service_area ?? ""} className={selectClass}>
                <option value="">All</option>
                {serviceAreas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label htmlFor="from" className="text-sm font-medium">From</label>
          <input id="from" name="from" type="date" defaultValue={filters.from} className={selectClass} />
        </div>
        <div>
          <label htmlFor="to" className="text-sm font-medium">To</label>
          <input id="to" name="to" type="date" defaultValue={filters.to} className={selectClass} />
        </div>
        <div className="flex items-end gap-2 lg:col-span-6">
          <button type="submit" className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
          <Link href={`/admin/${kind}`} className="rounded-lg px-4 py-2 text-sm font-semibold text-royal hover:underline">Clear</Link>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">{meta.title}</caption>
          <thead className="bg-ice text-left">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Submitted</th>
              <th scope="col" className="px-4 py-3 font-semibold">{kind === "applications" ? "Business" : "Name"}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{kind === "applications" ? "Category" : kind === "referrals" ? "Organization" : "Topic"}</th>
              {kind === "applications" && <th scope="col" className="px-4 py-3 font-semibold">Service areas</th>}
              <th scope="col" className="px-4 py-3 font-semibold">Email</th>
              <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-navy-soft">No submissions match these filters.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line hover:bg-cloud">
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-navy-soft">{formatDate(r.created_at)}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/${kind}/${r.id}`} className="text-royal hover:underline">
                    {String(r[meta.nameKey] ?? "(no name)")}
                  </Link>
                </td>
                <td className="px-4 py-3">{String(r[meta.secondaryKey] ?? "")}</td>
                {kind === "applications" && (
                  <td className="px-4 py-3">{(r.service_areas as string[] | undefined)?.join(", ")}</td>
                )}
                <td className="px-4 py-3">{String(r.email ?? "")}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
