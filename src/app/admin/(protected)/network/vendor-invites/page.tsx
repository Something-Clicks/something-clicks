import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { formatDate } from "@/lib/admin-fields";
import { dbConfigured } from "@/lib/db";
import { inviteQueue, type InviteRow } from "@/lib/planner/partners";
import { approveInviteAction, inviteStatusAction } from "../planner-actions";

type Search = { done?: string; error?: string };

export default async function VendorInvitesAdmin({ searchParams }: { searchParams: Promise<Search> }) {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const sp = await searchParams;
  let rows: InviteRow[] | null = null;
  try {
    rows = await inviteQueue();
  } catch {
    rows = null;
  }
  return (
    <>
      <NetworkNav active="/admin/network/planner-partners" />
      <h1 className="text-3xl">Vendor invites</h1>
      <p className="mt-2 max-w-3xl text-sm text-navy-soft">
        Businesses Planner Partners recommended. Nothing is emailed until you press Approve and email (one invitation, with an unsubscribe
        link and our mailing address). A business counts as claimed once its owner claims with the invited address, or when you link it.
      </p>
      {sp.done && <p role="status" className="mt-4 rounded-xl bg-ice px-4 py-3 text-sm">{sp.done}</p>}
      {sp.error && <p role="alert" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-danger ring-1 ring-line">{sp.error}</p>}
      {rows === null && <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">Apply the <code>planner_partners</code> migration first (job migrate).</p>}
      {rows && rows.length === 0 && <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">No invites yet.</p>}
      <ul className="mt-6 space-y-3">
        {rows?.map((v) => (
          <li key={v.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong>{v.name}</strong>
              <span className="text-sm text-navy-soft">
                {v.claimed ? "Claimed" : v.status} · from {v.partner_name} · {formatDate(v.created_at.toISOString())}
              </span>
            </div>
            <p className="text-sm text-navy-soft">{[v.category_label, v.city, v.contact_email].filter(Boolean).join(" · ")}</p>
            {v.note && <p className="mt-1 text-sm">&ldquo;{v.note}&rdquo;</p>}
            {!v.claimed && v.status !== "declined" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {v.status === "new" && (
                  <form action={approveInviteAction}>
                    <input type="hidden" name="id" value={v.id} />
                    <button className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/90">Approve and email</button>
                  </form>
                )}
                <form action={inviteStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="status" value="claimed" />
                  <input name="claimed_place_id" inputMode="numeric" placeholder="Listing ID" aria-label="Listing ID" className="w-28 rounded-lg border border-field px-2.5 py-1.5 text-sm" />
                  <button className="rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-line hover:bg-ice">Mark claimed</button>
                </form>
                <form action={inviteStatusAction}>
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="status" value="declined" />
                  <button className="rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-line hover:bg-ice">Decline</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
