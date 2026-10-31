import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { formatPhone } from "@/content/network";
import { formatDate } from "@/lib/admin-fields";
import { dbConfigured } from "@/lib/db";
import { claimQueue } from "@/lib/members/claims";
import { approveClaimAction, rejectClaimAction } from "../claim-actions";

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ done?: string; error?: string }> }) {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const sp = await searchParams;
  const claims = await claimQueue();
  return (
    <>
      <NetworkNav active="/admin/network/claims" />
      <h1 className="text-3xl">Claims to review</h1>
      <p className="mt-2 max-w-3xl text-sm text-navy-soft">
        Claims made with an address at the business&rsquo;s own website domain are approved automatically when the link is opened.
        Everything else waits here. Approve only when the evidence ties the person to the business.
      </p>
      {sp.done && <p role="status" className="mt-4 rounded-lg bg-ice p-3 text-sm">Claim {sp.done}.</p>}
      {sp.error && <p role="alert" className="mt-4 rounded-lg bg-[#FDECEC] p-3 text-sm font-medium text-danger">{sp.error}</p>}
      {claims.length === 0 && <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">Nothing to review.</p>}
      <ul className="mt-6 space-y-4">
        {claims.map((c) => (
          <li key={c.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl">
                {c.name} {c.is_new && <span className="ml-1 rounded-full bg-ice px-2 py-0.5 text-xs font-semibold">Added by owner</span>}
              </h2>
              <span className="text-xs text-navy-soft">{formatDate(c.created_at.toISOString())}</span>
            </div>
            <p className="text-sm text-navy-soft">{[c.category_label, c.locality, c.region].filter(Boolean).join(" · ")}</p>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="inline text-navy-soft">Claimant: </dt><dd className="inline break-all">{c.email}</dd></div>
              <div>
                <dt className="inline text-navy-soft">Email confirmed: </dt>
                <dd className={`inline font-semibold ${c.email_confirmed_at ? "text-success" : "text-danger"}`}>
                  {c.email_confirmed_at ? "yes" : "not yet"}
                </dd>
              </div>
              <div><dt className="inline text-navy-soft">Website: </dt><dd className="inline break-all">{c.website || "—"}</dd></div>
              <div><dt className="inline text-navy-soft">Listed phone: </dt><dd className="inline">{c.phone ? formatPhone(c.phone) : "—"}</dd></div>
              <div className="sm:col-span-2">
                <dt className="inline text-navy-soft">Domains: </dt>
                <dd className="inline">email {c.evidence.email_domain ?? "—"} · website {c.evidence.website_domain ?? "none"}</dd>
              </div>
              {c.evidence.note && (
                <div className="sm:col-span-2"><dt className="inline text-navy-soft">Note: </dt><dd className="inline whitespace-pre-wrap">{c.evidence.note}</dd></div>
              )}
            </dl>
            <div className="mt-4 flex flex-wrap items-start gap-3">
              <form action={approveClaimAction}>
                <input type="hidden" name="claim_id" value={c.id} />
                <button type="submit" disabled={!c.email_confirmed_at}
                        className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  Approve
                </button>
              </form>
              <form action={rejectClaimAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="claim_id" value={c.id} />
                <label className="sr-only" htmlFor={`note-${c.id}`}>Reason</label>
                <input id={`note-${c.id}`} name="note" maxLength={500} placeholder="Reason (optional, included in the email)"
                       className="w-72 rounded-lg border border-field px-3 py-2 text-sm" />
                <label className="inline-flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="tell" defaultChecked /> Email them
                </label>
                <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold text-danger ring-1 ring-line">Reject</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
