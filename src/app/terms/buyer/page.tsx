import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/placeholder-notice";
import { PageHeader } from "@/components/site-chrome";
import { BUYER_TERMS_VERSION } from "@/lib/constants";

export const metadata: Metadata = { title: "Buyer terms" };

export default function BuyerTermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title="Buyer terms" intro="For commercial cleaning companies buying walkthrough appointments." />
      <PlaceholderNotice version={BUYER_TERMS_VERSION} />
      <div className="prose-sc">
        <h2>1. Appointment credits</h2>
        <p>[Placeholder] Credits are prepaid through Stripe. One credit is held when an appointment is booked for you.</p>
        <h2>2. Exclusivity</h2>
        <p>[Placeholder] Each appointment is shared with one cleaning company unless stated otherwise.</p>
        <h2>3. Confirming outcomes</h2>
        <p>
          [Placeholder] You agree to report whether each walkthrough was completed, a no-show, or canceled. How
          unconfirmed appointments are reviewed and resolved will be described here.
        </p>
        <h2>4. No-shows, cancellations, and disputes</h2>
        <p>[Placeholder] Dispute window, evidence, and how held credits are released or consumed.</p>
        <h2>5. Refunds</h2>
        <p>[Placeholder] Refund policy for unused credits.</p>
        <h2>6. Use of business information</h2>
        <p>[Placeholder] Business details may only be used to contact that business about its walkthrough and quote.</p>
      </div>
    </div>
  );
}
