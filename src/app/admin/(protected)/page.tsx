import Link from "next/link";
import { kindMeta, kinds } from "@/lib/admin-fields";
import { getStore } from "@/lib/store";

const formFor = { applications: "application", referrals: "referral", contacts: "contact" } as const;

export default async function AdminOverview() {
  const store = getStore();
  const [lists, events] = await Promise.all([
    Promise.all(kinds.map((k) => store.list(k, { limit: 5000 }))),
    store.eventCounts(30),
  ]);
  const count = (form: string, event: string) => events.find((e) => e.form === form && e.event === event)?.count ?? 0;

  return (
    <>
      <h1 className="text-3xl">Overview</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        {kinds.map((k, i) => {
          const rows = lists[i];
          const byStatus = kindMeta[k].statuses.map((s) => [s, rows.filter((r) => r.status === s).length] as const);
          return (
            <section key={k} className="rounded-2xl bg-white p-6 ring-1 ring-line" aria-labelledby={`h-${k}`}>
              <h2 id={`h-${k}`} className="text-lg">
                <Link href={`/admin/${k}`} className="hover:text-royal hover:underline">
                  {kindMeta[k].title}
                </Link>
              </h2>
              <p className="mt-1 text-4xl font-semibold tabular-nums">{rows.length}</p>
              <ul className="mt-4 space-y-1 text-sm">
                {byStatus.map(([s, n]) => (
                  <li key={s} className="flex justify-between">
                    <Link href={`/admin/${k}?status=${s}`} className="capitalize text-royal hover:underline">
                      {s}
                    </Link>
                    <span className="tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-line" aria-labelledby="funnel-heading">
        <h2 id="funnel-heading" className="text-lg">
          Form activity, last 30 days
        </h2>
        <p className="mt-1 text-sm text-navy-soft">First-party, cookieless counts. Page views are in Vercel Web Analytics (and Google Analytics, if configured).</p>
        <table className="mt-4 w-full max-w-lg text-sm">
          <thead>
            <tr className="text-left text-navy-soft">
              <th className="py-2 font-medium">Form</th>
              <th className="py-2 text-right font-medium">Started</th>
              <th className="py-2 text-right font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => (
              <tr key={k} className="border-t border-line">
                <td className="py-2">{kindMeta[k].title}</td>
                <td className="py-2 text-right tabular-nums">{count(formFor[k], "form_start")}</td>
                <td className="py-2 text-right tabular-nums">{count(formFor[k], "form_submit")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
