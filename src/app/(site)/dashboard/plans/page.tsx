import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import { DashboardShell } from "@/components/members/DashboardShell";
import { NoBusiness } from "@/components/members/NoBusiness";
import { Notice } from "@/components/members/fields";
import { ReferralInput } from "@/components/members/ReferralInput";
import { SubmitButton } from "@/components/members/SubmitButton";
import { P } from "@/components/Placeholder";
import { loadDashboard } from "@/lib/members/dashboard";
import { billingFor, canBuy, membershipLive } from "@/lib/payments/billing";
import { paymentsConfigured, plans, type PlanKind } from "@/lib/payments/plans";
import { partnerFor } from "@/lib/planner/partners";
import { readiness } from "@/lib/readiness";
import { checkoutAction, portalAction } from "./actions";

export const metadata: Metadata = { title: "Plans", robots: { index: false } };

type Search = { place?: string; done?: string; error?: string };

const done: Record<string, string> = {
  campaign: "Thanks! Your managed campaign is booked. We'll be in touch to get started.",
  membership: "Welcome! Your membership is active.",
};

const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;
const date = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const campaignStatus: Record<string, string> = { new: "Booked", in_progress: "In progress", done: "Done", cancelled: "Cancelled" };

export default async function PlansPage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!(await readiness()).members) return null;
  const sp = await searchParams;
  const ctx = await loadDashboard("/dashboard/plans", sp.place);
  if (ctx.kind === "none") return <NoBusiness email={ctx.member.email} pending={ctx.pending} />;
  const { place } = ctx;
  const configured = paymentsConfigured();
  const billing = configured ? await billingFor(place.id).catch(() => null) : null;
  const member = membershipLive(billing?.membership ?? null);
  // Planner Partners are members at no charge until their end date.
  const partner = await partnerFor(place.id);
  const complimentary = partner?.active ? partner : null;
  const eligible = canBuy(place);

  const buy = (kind: PlanKind, label: string) => (
    <form action={checkoutAction}>
      <input type="hidden" name="place_id" value={place.id} />
      <input type="hidden" name="kind" value={kind} />
      <ReferralInput />
      <SubmitButton pendingLabel="Opening checkout…" className="w-full" disabled={!eligible || !configured}>{label}</SubmitButton>
    </form>
  );

  return (
    <DashboardShell active="/dashboard/plans" place={place} places={ctx.places} incoming={ctx.incoming}>
      <div className="space-y-4">
        {sp.error && <Notice>{sp.error}</Notice>}
        {sp.done && done[sp.done] && <Notice tone="success">{done[sp.done]}</Notice>}
        {!configured && <Notice>Plans aren&rsquo;t available yet.</Notice>}
        {configured && !eligible && (
          <Notice>Plans are for verified businesses. Once we&rsquo;ve verified your claim, you can buy one here.</Notice>
        )}
      </div>
      <p className="mt-2 text-navy-soft">Claiming your business and seeing your matches is free. Plans never change who you&rsquo;re matched with.</p>

      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        <li className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-line">
          <h2 className="text-xl">{plans.campaign.name}</h2>
          <p className="mt-1"><span className="text-3xl font-bold">{plans.campaign.price}</span> <span className="text-navy-soft">{plans.campaign.cadence}</span></p>
          <p className="mt-3 flex-1 text-navy-soft"><P value={plans.campaign.blurb} /></p>
          <div className="mt-5">{buy("campaign", "Get a managed campaign")}</div>
        </li>
        <li className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-line">
          <h2 className="text-xl">{plans.membership.name}</h2>
          <p className="mt-1"><span className="text-3xl font-bold">{plans.membership.price}</span> <span className="text-navy-soft">{plans.membership.cadence}</span></p>
          <p className="mt-3 flex-1 text-navy-soft"><P value={plans.membership.blurb} /></p>
          <div className="mt-5">
            {complimentary ? (
              <p className="flex items-start gap-2 rounded-2xl bg-ice p-4 text-sm">
                <CircleCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-royal" />
                <span>
                  <strong>You&rsquo;re a member as a Planner Partner</strong> until {date(new Date(`${complimentary.ends_on}T12:00:00Z`))}. There&rsquo;s nothing to pay.
                </span>
              </p>
            ) : member && billing?.membership ? (
              <p className="flex items-start gap-2 rounded-2xl bg-ice p-4 text-sm">
                <CircleCheck aria-hidden="true" className="h-5 w-5 shrink-0 text-royal" />
                <span>
                  <strong>You&rsquo;re a member.</strong>{" "}
                  {billing.membership.status === "past_due"
                    ? "Your last payment didn't go through; update your card in Billing."
                    : billing.membership.current_period_end
                      ? `${billing.membership.cancel_at_period_end ? "Ends" : "Renews"} ${date(billing.membership.current_period_end)}.`
                      : ""}
                </span>
              </p>
            ) : (
              buy("membership", "Become a member")
            )}
          </div>
        </li>
      </ul>

      {billing?.hasCustomer && (
        <section className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-line" aria-labelledby="billing-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="billing-heading" className="text-xl">Billing</h2>
            <form action={portalAction}>
              <input type="hidden" name="place_id" value={place.id} />
              <SubmitButton variant="secondary" pendingLabel="Opening…">Manage billing</SubmitButton>
            </form>
          </div>
          <p className="mt-1 text-sm text-navy-soft">Cancel your membership, update your card or download invoices on Stripe.</p>
          {billing.purchases.length > 0 && (
            <ul className="mt-4 divide-y divide-line text-sm">
              {billing.purchases.map((p) => (
                <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                  <span>{plans[p.kind].name} · {date(p.created_at)}</span>
                  <span className="text-navy-soft">
                    {money(p.amount_cents)}
                    {p.status !== "paid" && ` · ${p.status === "refunded" ? "Refunded" : "Partly refunded"}`}
                    {p.campaign_status && ` · ${campaignStatus[p.campaign_status] ?? p.campaign_status}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </DashboardShell>
  );
}
