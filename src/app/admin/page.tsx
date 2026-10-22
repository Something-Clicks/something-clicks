import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function count(table: string, filter?: [string, string]) {
  let q = supabaseAdmin().from(table).select("*", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count: n } = await q;
  return n ?? 0;
}

export default async function AdminOverview() {
  const [pendingBuyers, approvedBuyers, pendingApps, waiting, needsReview, settings] = await Promise.all([
    count("buyers", ["status", "pending"]),
    count("buyers", ["status", "approved"]),
    count("partner_applications", ["status", "pending"]),
    count("referrals", ["status", "waiting_for_match"]),
    count("credit_purchases", ["status", "needs_review"]),
    supabaseAdmin().from("settings").select("commission_amount_cents, price_per_appointment_cents").maybeSingle(),
  ]);

  const cards = [
    { label: "Buyers awaiting approval", value: pendingBuyers, href: "/admin/buyers" },
    { label: "Approved buyers", value: approvedBuyers, href: "/admin/buyers" },
    { label: "Partner applications to review", value: pendingApps, href: "/admin/applications" },
    { label: "Booking requests waiting for match", value: waiting, href: "/admin/requests" },
    { label: "Purchases needing review", value: needsReview, href: "/admin/buyers" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Admin</h1>
      {!settings.data?.commission_amount_cents || !settings.data?.price_per_appointment_cents ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Price per appointment and/or commission amount are not set.{" "}
          <Link href="/admin/settings" className="underline">
            Configure them
          </Link>{" "}
          before launch. Commissions can never be created while the commission amount is unset.
        </div>
      ) : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="card hover:border-brand-600">
            <p className="text-sm text-zinc-600">{c.label}</p>
            <p className="mt-1 text-3xl font-bold">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
