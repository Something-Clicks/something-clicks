import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { attributionFields, formatDate, formatValue, isKind, kindMeta, sections } from "@/lib/admin-fields";
import { getStore } from "@/lib/store";
import { updateSubmission } from "../../../actions";

export default async function AdminDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { kind, id } = await params;
  if (!isKind(kind)) notFound();
  const row = await getStore().get(kind, id);
  if (!row) notFound();
  const { saved } = await searchParams;
  const meta = kindMeta[kind];

  return (
    <>
      <Link href={`/admin/${kind}`} className="inline-flex items-center gap-1 text-sm font-semibold text-royal hover:underline">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {meta.title}
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl">{String(row[meta.nameKey] ?? meta.singular)}</h1>
        <StatusBadge status={row.status} />
      </div>
      <p className="mt-1 text-sm text-navy-soft">
        Submitted {formatDate(row.created_at)} · Updated {formatDate(row.updated_at)}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {sections[kind].map((section) => (
            <section key={section.title} className="rounded-2xl bg-white p-6 ring-1 ring-line">
              <h2 className="text-lg">{section.title}</h2>
              <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {section.fields.map((f) => {
                  const value = formatValue(f, row[f.key]);
                  if (!value) return null;
                  return (
                    <div key={f.key} className={f.long ? "sm:col-span-2" : ""}>
                      <dt className="text-sm font-medium text-navy-soft">{f.label}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words">
                        {f.key === "email" ? (
                          <a href={`mailto:${value}`} className="text-royal underline">{value}</a>
                        ) : f.key === "website" && /^https?:\/\//.test(value) ? (
                          <a href={value} target="_blank" rel="noopener noreferrer nofollow" className="text-royal underline">{value}</a>
                        ) : (
                          value
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
          <section className="rounded-2xl bg-white p-6 ring-1 ring-line">
            <h2 className="text-lg">Source</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {attributionFields.map((f) => (
                <div key={f.key}>
                  <dt className="text-sm font-medium text-navy-soft">{f.label}</dt>
                  <dd className="mt-0.5 break-words">{String(row[f.key] ?? "") || "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside>
          <form action={updateSubmission} className="sticky top-6 space-y-4 rounded-2xl bg-white p-6 ring-1 ring-line">
            <h2 className="text-lg">Review</h2>
            {saved && (
              <p role="status" className="flex items-center gap-2 rounded-lg bg-[#e7f6ee] p-3 text-sm text-success">
                <CircleCheck aria-hidden="true" className="h-4 w-4" /> Saved
              </p>
            )}
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={row.id} />
            <div>
              <label htmlFor="status" className="text-sm font-medium">Status</label>
              <select id="status" name="status" defaultValue={row.status} className="mt-1 block w-full rounded-lg border border-field bg-white px-3 py-2">
                {meta.statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="internal_notes" className="text-sm font-medium">Internal notes</label>
              <p className="text-xs text-navy-soft">Only visible in the admin area.</p>
              <textarea
                id="internal_notes"
                name="internal_notes"
                rows={8}
                maxLength={10000}
                defaultValue={row.internal_notes}
                className="mt-1 block w-full rounded-lg border border-field px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" className="w-full rounded-lg bg-royal px-4 py-2.5 font-semibold text-white hover:bg-navy">
              Save
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
