import type { Metadata } from "next";
import { PageHeader } from "@/components/site-chrome";
import { PartnerApplicationForm } from "./application-form";

export const metadata: Metadata = { title: "Become a referral partner" };

// The partner program is not open yet. Reward details are deliberately not read from settings, so
// configuring a commission amount in admin cannot publish a reward before the program launches.
export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader
        title="Become a referral partner"
        intro="You already hear when a business is moving, expanding, or unhappy with its cleaning company. We're preparing a referral partner program for the people who hear about these needs first. Apply now, and we'll be in touch before it opens."
      />

      <div className="grid gap-10 lg:grid-cols-5">
        <div className="prose-sc lg:col-span-2">
          <h2 className="!mt-0">Who should apply</h2>
          <ul>
            <li>Commercial realtors and brokers</li>
            <li>Leasing agents</li>
            <li>Property managers</li>
            <li>Commercial movers</li>
            <li>Office furniture installers</li>
            <li>Property maintenance companies</li>
          </ul>

          <h2>What to refer</h2>
          <p>
            Businesses in the Salt Lake Valley that need commercial cleaning — offices, medical and dental, retail,
            warehouses, schools, gyms — and have agreed that you can pass their details to us.
          </p>

          <h2>Rewards</h2>
          <p>
            Partner rewards are planned for referrals that lead to a completed walkthrough. The amount, eligibility, and
            payout terms will be confirmed in writing before you refer anyone.
          </p>

          <h2>When a reward would be earned</h2>
          <p>
            When the program opens, a reward will only be earned after the cleaning company completes the walkthrough with
            the business you referred and the dispute window has passed. Referrals that don&apos;t book, don&apos;t show
            up, or are already in our system won&apos;t qualify.
          </p>

          <h2>How it works</h2>
          <ul>
            <li>Apply below. We review every application by hand.</li>
            <li>If you&apos;re approved, we&apos;ll contact you with next steps before the program opens.</li>
            <li>
              Businesses always confirm their own details and give their own consent before anything is shared with a
              cleaning company.
            </li>
          </ul>
        </div>

        <div className="card self-start lg:col-span-3">
          <h2 className="text-xl font-semibold">Apply to be a partner</h2>
          <p className="mt-1 mb-6 text-sm text-zinc-600">
            Takes about two minutes. The program is not open yet; we&apos;ll confirm the details before referrals begin.
          </p>
          <PartnerApplicationForm />
        </div>
      </div>
    </div>
  );
}
