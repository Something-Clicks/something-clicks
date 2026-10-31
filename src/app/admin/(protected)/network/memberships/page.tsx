import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { dbConfigured } from "@/lib/db";
import { listMemberships, type MembershipRow } from "@/lib/payments/billing";
import { LIVE_MEMBERSHIP } from "@/lib/payments/plans";

export default async function MembershipsPage() {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  let rows: MembershipRow[] = [];
  let missing = false;
  try {
    rows = await listMemberships();
  } catch {
    missing = true;
  }
  const live = rows.filter((r) => (LIVE_MEMBERSHIP as readonly string[]).includes(r.status));
  return (
    <>
      <NetworkNav active="/admin/network/memberships" />
      <h1 className="text-3xl">Memberships</h1>
      <p className="mt-2 text-sm text-navy-soft">{live.length} active. Mirrored from Stripe; cancellations and failed renewals update here on their own.</p>
      {missing && <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">Apply the <code>payments</code> migration first (job migrate).</p>}
      {!missing && rows.length === 0 && <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">No memberships yet.</p>}
      {rows.length > 0 && (
        <table className="mt-6 w-full rounded-2xl bg-white text-sm ring-1 ring-line">
          <thead className="text-left text-navy-soft"><tr><th className="px-4 py-2">Business</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Renews or ends</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.place_id} className="border-t border-line">
                <td className="px-4 py-2">{r.business}<span className="block text-navy-soft">{[r.locality, r.region].filter(Boolean).join(", ")}</span></td>
                <td className="px-4 py-2">{r.status.replace("_", " ")}{r.cancel_at_period_end && " · cancels at period end"}</td>
                <td className="px-4 py-2">{r.current_period_end ? r.current_period_end.toLocaleDateString("en-US") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
