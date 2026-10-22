import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/placeholder-notice";
import { PageHeader } from "@/components/site-chrome";
import { PARTNER_TERMS_VERSION } from "@/lib/constants";

export const metadata: Metadata = { title: "Partner terms" };

export default function PartnerTermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title="Referral partner terms" />
      <PlaceholderNotice version={PARTNER_TERMS_VERSION} />
      <div className="prose-sc">
        <h2>1. Only refer businesses that agreed to be contacted</h2>
        <p>[Placeholder] You must have the business&apos;s permission before sharing its details with us.</p>
        <h2>2. No spam or bulk messaging</h2>
        <p>[Placeholder] No cold email blasts, mass texts, purchased lists, or automated outreach using your link.</p>
        <h2>3. No self-referrals</h2>
        <p>[Placeholder] You may not refer your own business, or a business you own or control.</p>
        <h2>4. Our right to reject or void referrals</h2>
        <p>[Placeholder] Something Clicks may reject, mark as duplicate, or void any referral.</p>
        <h2>5. When commission is earned</h2>
        <p>
          [Placeholder] Commission is earned only for a completed walkthrough, after the dispute window has passed and
          the cleaning company has been charged for that appointment.
        </p>
        <h2>6. Payouts</h2>
        <p>[Placeholder] Payout method, timing, fees, minimums, and tax forms.</p>
      </div>
    </div>
  );
}
