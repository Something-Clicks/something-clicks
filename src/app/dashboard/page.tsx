import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { requireBuyerUser } from "@/lib/auth";
import { loadBalance, loadBuyerProfile, loadPurchases, PURCHASE_STATUS_LABELS } from "@/lib/buyers";
import { formatCents, formatDateTime } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { startCheckout } from "./actions";
import { DashboardNotice } from "./dashboard-notice";

export const metadata: Metadata = { title: "Dashboard" };

const NOTICES: Record<string, { tone: "ok" | "warn"; text: string }> = {
  success: {
    tone: "ok",
    text: "Thanks. Stripe is confirming your payment, and your credits will appear here once it's confirmed. Bank payments can take a few business days.",
  },
  cancelled: { tone: "warn", text: "Checkout was cancelled. You have not been charged." },
  not_approved: { tone: "warn", text: "Your company needs to be approved before you can buy the pilot." },
  pack_unavailable: { tone: "warn", text: "That credit pack is no longer available." },
  checkout_failed: { tone: "warn", text: "We couldn't start checkout. Please try again in a few minutes." },
  saved: { tone: "ok", text: "Your company details were saved." },
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string; saved?: string }>;
}) {
  const user = await requireBuyerUser();
  const buyer = await loadBuyerProfile({ userId: user.id });
  if (!buyer) redirect("/onboarding");

  const params = await searchParams;
  const notice = NOTICES[params.checkout ?? params.error ?? (params.saved ? "saved" : "")];
  const [balance, purchases, packsResult] = await Promise.all([
    loadBalance(buyer.id),
    loadPurchases(buyer.id),
    supabaseAdmin()
      .from("credit_packs")
      .select("id, name, credits, price_cents")
      .eq("active", true)
      .order("sort_order")
      .order("price_cents"),
  ]);
  const packs = (packsResult.data ?? []) as { id: string; name: string; credits: number; price_cents: number }[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{buyer.company_name}</h1>
          <p className="mt-1 text-sm text-zinc-600">Signed in as {user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/onboarding" className="btn-secondary">
            Company settings
          </Link>
          <form action="/auth/signout" method="post">
            <button className="btn-secondary" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>

      {notice ? <DashboardNotice tone={notice.tone}>{notice.text}</DashboardNotice> : null}

      {buyer.status !== "approved" ? (
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {buyer.status === "pending"
            ? "We're reviewing your company. We'll email you when it's approved, and then you can buy the pilot."
            : buyer.status === "suspended"
              ? "Your account is suspended, so you can't buy credits right now."
              : "Your company wasn't approved, so you can't buy credits."}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Available credits" value={balance.available} />
      </section>

      {buyer.status === "approved" ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Buy walkthrough credits</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Each credit pays for one qualifying completed walkthrough. A scheduled walkthrough on its own doesn&apos;t
            count. The{" "}
            <Link href="/terms/buyer" className="font-medium text-brand-700 underline underline-offset-4">
              buyer terms
            </Link>{" "}
            (draft) explain what qualifies and how credits are held, used, and returned.
          </p>
          {packs.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">No credit packs are on sale right now. Please check back soon.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((pack) => (
                <form key={pack.id} action={startCheckout} className="card flex flex-col">
                  <input type="hidden" name="pack_id" value={pack.id} />
                  <h3 className="font-semibold">{pack.name}</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    {pack.credits} walkthrough credit{pack.credits === 1 ? "" : "s"}
                  </p>
                  <p className="mt-3 text-2xl font-bold">{formatCents(pack.price_cents)}</p>
                  <p className="text-xs text-zinc-500">
                    {formatCents(Math.round(pack.price_cents / pack.credits))} per qualifying completed walkthrough
                  </p>
                  <div className="mt-4">
                    <SubmitButton pendingText="Opening checkout…">Continue to secure checkout</SubmitButton>
                  </div>
                </form>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Purchases</h2>
        {purchases.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-600">No purchases yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pack</th>
                  <th>Credits</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDateTime(p.created_at)}</td>
                    <td>{p.pack_name}</td>
                    <td>
                      {p.credits}
                      {p.credits_refunded ? ` (${p.credits_refunded} refunded)` : ""}
                    </td>
                    <td>{formatCents(p.amount_cents)}</td>
                    <td>{PURCHASE_STATUS_LABELS[p.status] ?? p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Walkthroughs</h2>
        <p className="mt-3 text-sm text-zinc-600">
          For now, walkthroughs are arranged with you directly by the Something Clicks team. Tracking them on this page
          isn&apos;t available yet.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </div>
  );
}
