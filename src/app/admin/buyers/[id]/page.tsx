import { notFound } from "next/navigation";
import { adjustCredits, setBuyerStatus } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { loadBalance, loadBuyerProfile, loadPurchases, PURCHASE_STATUS_LABELS } from "@/lib/buyers";
import { CLEANING_FREQUENCIES, PROPERTY_TYPES, WEEKDAYS } from "@/lib/constants";
import { formatCents, formatDateTime, labelFor } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

type LedgerRow = { id: number; entry_type: string; delta: number; note: string | null; actor: string; created_at: string };

export default async function AdminBuyerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const buyer = await loadBuyerProfile({ buyerId: id });
  if (!buyer) notFound();
  const [balance, purchases, { data: ledger }] = await Promise.all([
    loadBalance(id),
    loadPurchases(id),
    supabaseAdmin()
      .from("credit_ledger")
      .select("id, entry_type, delta, note, actor, created_at")
      .eq("buyer_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const statusButton = (action: string, label: string, className = "btn-secondary") => (
    <form action={setBuyerStatus}>
      <input type="hidden" name="buyer_id" value={buyer.id} />
      <input type="hidden" name="action" value={action} />
      <SubmitButton className={className}>{label}</SubmitButton>
    </form>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{buyer.company_name}</h1>
          <p className="text-sm text-zinc-600">
            {buyer.contact_name} · {buyer.email} · {buyer.phone}
            {buyer.website ? ` · ${buyer.website}` : ""}
          </p>
          <p className="mt-1 text-sm">
            Status: <strong>{buyer.status}</strong> · Terms {buyer.terms_version} agreed {formatDateTime(buyer.terms_agreed_at)}
          </p>
        </div>
        <div className="flex gap-2">
          {buyer.status !== "approved" ? statusButton("approve", "Approve", "btn") : null}
          {buyer.status === "pending" ? statusButton("reject", "Reject", "btn-danger") : null}
          {buyer.status === "approved" ? statusButton("suspend", "Suspend", "btn-danger") : null}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card text-sm">
          <h2 className="font-semibold">Service area & criteria</h2>
          <p className="mt-2">Areas: {buyer.service_areas.join(", ") || "—"}</p>
          <p>Min sq ft: {buyer.criteria?.min_sq_ft ?? "—"}</p>
          <p>Property types: {buyer.criteria?.property_types.map((t) => labelFor(PROPERTY_TYPES, t)).join(", ") || "—"}</p>
          <p>
            Frequencies:{" "}
            {buyer.criteria?.cleaning_frequencies.map((f) => labelFor(CLEANING_FREQUENCIES, f)).join(", ") || "—"}
          </p>
          {buyer.criteria?.notes ? <p>Notes: {buyer.criteria.notes}</p> : null}
        </div>
        <div className="card text-sm">
          <h2 className="font-semibold">Availability</h2>
          <ul className="mt-2">
            {buyer.availability.map((a) => (
              <li key={a.day_of_week}>
                {WEEKDAYS[a.day_of_week]}: {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <h2 className="font-semibold">Credits</h2>
        <p className="mt-2 text-sm">
          Available <strong>{balance.available}</strong> · Held {balance.reserved} · Purchased {balance.purchased} · Consumed{" "}
          {balance.consumed}
        </p>
        <form action={adjustCredits} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="buyer_id" value={buyer.id} />
          <label className="text-sm">
            Credits (+/-)
            <input name="delta" type="number" required className="input mt-1 w-28" />
          </label>
          <label className="flex-1 text-sm">
            Reason (recorded in the ledger and audit log)
            <input name="note" required minLength={3} className="input mt-1" />
          </label>
          <SubmitButton className="btn-secondary">Add adjustment</SubmitButton>
        </form>
        {error === "adjustment" ? <p className="mt-2 text-sm text-red-700">Enter a non-zero number and a reason.</p> : null}
      </section>

      <section>
        <h2 className="font-semibold">Purchases</h2>
        <table className="table mt-2">
          <thead>
            <tr>
              <th>Date</th>
              <th>Pack</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td>{formatDateTime(p.created_at)}</td>
                <td>
                  {p.pack_name} ({p.credits})
                </td>
                <td>
                  {formatCents(p.amount_cents)}
                  {p.refunded_cents ? ` (refunded ${formatCents(p.refunded_cents)})` : ""}
                </td>
                <td>
                  {PURCHASE_STATUS_LABELS[p.status] ?? p.status}
                  {p.review_reason ? <div className="text-xs text-red-700">{p.review_reason}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-semibold">Ledger</h2>
        <table className="table mt-2">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Change</th>
              <th>Note</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {((ledger ?? []) as LedgerRow[]).map((l) => (
              <tr key={l.id}>
                <td>{formatDateTime(l.created_at)}</td>
                <td>{l.entry_type}</td>
                <td>{l.delta > 0 ? `+${l.delta}` : l.delta}</td>
                <td>{l.note ?? "—"}</td>
                <td className="text-xs text-zinc-500">{l.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
