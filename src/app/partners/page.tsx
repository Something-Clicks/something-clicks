import type { Metadata } from "next";
import { PageHeader } from "@/components/site-chrome";
import { isSupabaseConfigured } from "@/lib/env";
import { formatCents } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PartnerApplicationForm } from "./application-form";

export const metadata: Metadata = { title: "Become a referral partner" };
export const dynamic = "force-dynamic";

async function commissionAmount(): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabaseAdmin().from("settings").select("commission_amount_cents").maybeSingle();
    return data?.commission_amount_cents ?? null;
  } catch {
    return null;
  }
}

export default async function PartnersPage() {
  const commission = await commissionAmount();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader
        title="Become a referral partner"
        intro="You already hear when a business is moving, expanding, or unhappy with its cleaning company. Point them to us, and earn a referral fee when the walkthrough happens."
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

          <h2>What you earn</h2>
          <p>
            {commission
              ? `${formatCents(commission)} for each completed walkthrough.`
              : "A flat referral fee for each completed walkthrough. We'll confirm the amount when you're approved."}
          </p>

          <h2>When it&apos;s earned</h2>
          <p>
            A commission is earned after the cleaning company completes the walkthrough with the business you referred
            and the short dispute window (normally 72 hours) has passed. You won&apos;t be paid for referrals that
            don&apos;t book, don&apos;t show up, or are already in our system.
          </p>

          <h2>How it works</h2>
          <ul>
            <li>Apply below. We review every application by hand.</li>
            <li>Once approved, you get a personal referral link, a QR code, and a partner portal to track referrals and payouts.</li>
            <li>Share your link, or submit a business directly. The business confirms its own details and books.</li>
          </ul>
        </div>

        <div className="card self-start lg:col-span-3">
          <h2 className="text-xl font-semibold">Apply to be a partner</h2>
          <p className="mt-1 mb-6 text-sm text-zinc-600">Takes about two minutes.</p>
          <PartnerApplicationForm />
        </div>
      </div>
    </div>
  );
}
