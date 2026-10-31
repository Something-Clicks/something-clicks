import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { formatDate } from "@/lib/admin-fields";
import { dbConfigured } from "@/lib/db";
import { listCampaigns, type CampaignRow } from "@/lib/payments/billing";
import { campaignAction } from "../campaign-actions";

const labels: Record<string, string> = { new: "New", in_progress: "In progress", done: "Done", cancelled: "Cancelled" };

export default async function CampaignsPage() {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  let rows: CampaignRow[] = [];
  let missing = false;
  try {
    rows = await listCampaigns();
  } catch {
    missing = true;
  }
  return (
    <>
      <NetworkNav active="/admin/network/campaigns" />
      <h1 className="text-3xl">Campaigns</h1>
      <p className="mt-2 max-w-3xl text-sm text-navy-soft">
        One entry per managed campaign bought through Stripe. Refunded campaigns move to Cancelled on their own. Payment never
        affects matching or ranking.
      </p>
      {missing && <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">Apply the <code>payments</code> migration first (job migrate).</p>}
      {!missing && rows.length === 0 && <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">No campaigns yet.</p>}
      <ul className="mt-6 space-y-4">
        {rows.map((c) => (
          <li key={c.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl">{c.business}</h2>
              <span className="text-sm text-navy-soft">
                {formatDate(c.created_at.toISOString())} · ${(c.amount_cents / 100).toFixed(2)}
                {c.purchase_status !== "paid" && <> · <strong className="text-danger">{c.purchase_status.replace("_", " ")}</strong></>}
              </span>
            </div>
            <p className="text-sm text-navy-soft">{[c.locality, c.region].filter(Boolean).join(", ")}{c.email ? ` · ${c.email}` : ""}</p>
            <form action={campaignAction} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={c.id} />
              <label className="text-sm">Status
                <select name="status" defaultValue={c.status} className="mt-1 block rounded-lg border border-field px-2.5 py-1.5 text-sm">
                  {Object.entries(labels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="min-w-64 flex-1 text-sm">Notes
                <input name="notes" defaultValue={c.notes} maxLength={2000} className="mt-1 block w-full rounded-lg border border-field px-2.5 py-1.5 text-sm" />
              </label>
              <button className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/90">Save</button>
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
