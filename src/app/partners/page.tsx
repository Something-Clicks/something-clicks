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
        intro="You hear first when a business is moving, expanding, or unhappy with its cleaning company. We're preparing a referral program for people like you. It isn't open yet, but you can apply now."
      />

      <div className="grid gap-10 lg:grid-cols-5">
        <div className="prose-sc lg:col-span-2">
          <h2 className="!mt-0">Who it&apos;s for</h2>
          <p>
            Commercial realtors, leasing agents, property managers, commercial movers, office furniture installers, and
            property maintenance companies.
          </p>

          <h2>What to refer</h2>
          <p>
            Salt Lake Valley businesses that need commercial cleaning and have agreed that you can pass their details to us.
          </p>

          <h2>What happens next</h2>
          <p>
            We review every application by hand. If you&apos;re approved, we&apos;ll contact you with next steps and the
            program details, including any rewards, before you start referring.
          </p>
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
