import Link from "next/link";
import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { formatDate } from "@/lib/admin-fields";
import { dbConfigured } from "@/lib/db";
import { addMonths, currentAgreement, eligibleBusinesses, listApplications, listPartners } from "@/lib/planner/partners";
import { endPartnerAction, markPartnerAction, rejectApplicationAction } from "../planner-actions";

type Search = { done?: string; error?: string };
const field = "mt-1 block rounded-lg border border-field bg-white px-2.5 py-1.5 text-sm";

export default async function PlannerPartnersAdmin({ searchParams }: { searchParams: Promise<Search> }) {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const sp = await searchParams;
  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load();
  } catch {
    data = null;
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <NetworkNav active="/admin/network/planner-partners" />
      <h1 className="text-3xl">Planner Partners</h1>
      <p className="mt-2 max-w-3xl text-sm text-navy-soft">
        Complimentary membership until the end date, recorded here (no Stripe charge). You get an email 30 days before each one ends.
        The Planner Partner label never affects matching, ranking or search. Current agreement: v{currentAgreement().version}.
      </p>
      {sp.done && <p role="status" className="mt-4 rounded-xl bg-ice px-4 py-3 text-sm">{sp.done}</p>}
      {sp.error && <p role="alert" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-danger ring-1 ring-line">{sp.error}</p>}
      {!data ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">Apply the <code>planner_partners</code> migration first (job migrate).</p>
      ) : (
        <>
          <form action={markPartnerAction} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5 ring-1 ring-line">
            <label className="text-sm">Business (claimed and verified)
              <select name="place_id" required defaultValue="" className={field}>
                <option value="" disabled>Choose…</option>
                {data.eligible.map((b) => <option key={b.id} value={b.id}>{b.name}{b.category_label ? ` · ${b.category_label}` : ""}</option>)}
              </select>
            </label>
            <label className="text-sm">Starts<input type="date" name="starts_on" defaultValue={today} className={field} /></label>
            <label className="text-sm">Ends<input type="date" name="ends_on" defaultValue={addMonths(today, 12)} className={field} /></label>
            <button className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90">Make Planner Partner</button>
          </form>

          {data.applications.length > 0 && (
            <>
              <h2 className="mt-8 text-xl">Applications</h2>
              <ul className="mt-3 space-y-3">
                {data.applications.map((a) => (
                  <li key={a.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <strong>{a.business}</strong>
                      <span className="text-sm text-navy-soft">{formatDate(a.created_at.toISOString())} · {a.email}</span>
                    </div>
                    <p className="text-sm text-navy-soft">Accepted agreement v{a.version} from IP {a.ip || "unknown"}</p>
                    {a.message && <p className="mt-2 whitespace-pre-wrap text-sm">{a.message}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <form action={markPartnerAction}>
                        <input type="hidden" name="place_id" value={a.place_id} />
                        <button className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/90">Approve (12 months from today)</button>
                      </form>
                      <form action={rejectApplicationAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <button className="rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-line hover:bg-ice">Decline</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <h2 className="mt-8 text-xl">Partners</h2>
          <p className="text-sm text-navy-soft"><Link href="/admin/network/vendor-invites" className="font-semibold text-navy underline">Vendor invites queue</Link></p>
          {data.partners.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">No Planner Partners yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl bg-white ring-1 ring-line">
              <table className="w-full text-sm">
                <thead className="text-left text-navy-soft">
                  <tr>
                    <th className="px-4 py-2">Business</th><th className="px-4 py-2">Membership</th><th className="px-4 py-2">Vendors invited</th>
                    <th className="px-4 py-2">Claimed</th><th className="px-4 py-2">Intros accepted</th><th className="px-4 py-2">Partnerships live</th>
                    <th className="px-4 py-2">Agreement</th><th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {data.partners.map((p) => (
                    <tr key={p.place_id} className="border-t border-line align-top">
                      <td className="px-4 py-2">{p.business}<span className="block text-navy-soft">{p.email}</span></td>
                      <td className="px-4 py-2">{p.active ? "Active" : p.ended_at ? "Ended" : "Not active"}<span className="block text-navy-soft">{p.starts_on} → {p.ends_on}</span></td>
                      <td className="px-4 py-2 tabular-nums">{p.invited}</td>
                      <td className="px-4 py-2 tabular-nums">{p.claimed}</td>
                      <td className="px-4 py-2 tabular-nums">{p.intros_accepted}</td>
                      <td className="px-4 py-2 tabular-nums">{p.partnerships_live}</td>
                      <td className="px-4 py-2">
                        {p.agreement_version ? (
                          <>v{p.agreement_version}<span className="block text-navy-soft">{p.accepted_at && formatDate(p.accepted_at.toISOString())} · {p.accepted_by} · IP {p.accepted_ip || "unknown"}</span></>
                        ) : (
                          <span className="text-danger">Not accepted yet</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {p.active && (
                          <form action={endPartnerAction}>
                            <input type="hidden" name="place_id" value={p.place_id} />
                            <button className="text-sm font-semibold text-navy underline">End</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

async function load() {
  const [partners, applications, eligible] = await Promise.all([listPartners(), listApplications(), eligibleBusinesses()]);
  return { partners, applications, eligible };
}
