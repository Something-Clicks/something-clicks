import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Row = { id: string; company_name: string; contact_name: string; email: string; status: string; created_at: string };

export default async function AdminBuyersPage() {
  const db = supabaseAdmin();
  const [{ data: buyers }, { data: balances }, { data: review }] = await Promise.all([
    db.from("buyers").select("id, company_name, contact_name, email, status, created_at").order("created_at", { ascending: false }),
    db.from("buyer_credit_balances").select("buyer_id, available, reserved"),
    db.from("credit_purchases").select("buyer_id").eq("status", "needs_review"),
  ]);
  const balanceOf = new Map((balances ?? []).map((b) => [b.buyer_id, b]));
  const needsReview = new Set((review ?? []).map((r) => r.buyer_id));

  return (
    <div>
      <h1 className="text-2xl font-bold">Buyers</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Credits (available / held)</th>
              <th>Signed up</th>
            </tr>
          </thead>
          <tbody>
            {((buyers ?? []) as Row[]).map((b) => (
              <tr key={b.id}>
                <td>
                  <Link href={`/admin/buyers/${b.id}`} className="font-medium text-brand-700 underline">
                    {b.company_name}
                  </Link>
                  {needsReview.has(b.id) ? <span className="ml-2 text-xs font-semibold text-red-700">purchase needs review</span> : null}
                </td>
                <td>
                  {b.contact_name}
                  <br />
                  <span className="text-zinc-500">{b.email}</span>
                </td>
                <td>{b.status}</td>
                <td>
                  {balanceOf.get(b.id)?.available ?? 0} / {balanceOf.get(b.id)?.reserved ?? 0}
                </td>
                <td>{formatDateTime(b.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!buyers?.length ? <p className="mt-4 text-sm text-zinc-600">No buyers yet.</p> : null}
      </div>
    </div>
  );
}
