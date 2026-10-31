import Link from "next/link";
import { Check } from "lucide-react";
import { P } from "@/components/Placeholder";
import { pageMeta } from "@/lib/metadata";
import { plans, type PlanKind } from "@/lib/payments/plans";

export const metadata = pageMeta({
  title: "Pricing",
  path: "/pricing",
  description: "Claiming your business and seeing your matches is free. Optional paid plans: a one-time managed campaign and a monthly membership.",
});

const order: PlanKind[] = ["campaign", "membership"];

export default function PricingPage() {
  return (
    <div className="bg-cloud">
      <div className="container-page py-12 sm:py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">Pricing</h1>
        <p className="mt-3 max-w-2xl text-lg text-navy-soft">
          Claiming your business and seeing your matches is free. Paid plans are optional and never change who you&rsquo;re matched with.
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          <li className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-line">
            <h2 className="text-xl">Free</h2>
            <p className="mt-1"><span className="text-3xl font-bold">$0</span></p>
            <ul className="mt-4 flex-1 space-y-2 text-navy-soft">
              {["Claim your business", "See your matches, and why", "Request introductions"].map((f) => (
                <li key={f} className="flex gap-2"><Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-royal" />{f}</li>
              ))}
            </ul>
            <Link href="/claim" className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl bg-navy font-semibold text-white hover:bg-navy/90">
              Claim your business
            </Link>
          </li>
          {order.map((k) => (
            <li key={k} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-line">
              <h2 className="text-xl">{plans[k].name}</h2>
              <p className="mt-1"><span className="text-3xl font-bold">{plans[k].price}</span> <span className="text-navy-soft">{plans[k].cadence}</span></p>
              <p className="mt-4 flex-1 text-navy-soft"><P value={plans[k].blurb} /></p>
              <Link href="/dashboard/plans" className="mt-6 inline-flex h-12 items-center justify-center rounded-2xl font-semibold text-navy ring-1 ring-inset ring-navy hover:bg-ice">
                {k === "campaign" ? "Get a managed campaign" : "Become a member"}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-navy-soft">
          Plans are for verified owners of a claimed business. Payments are handled by Stripe; we never see your card details.
        </p>
      </div>
    </div>
  );
}
