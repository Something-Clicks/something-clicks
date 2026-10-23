import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site-chrome";
import { DraftTermsNotice, OwnerDecision } from "@/components/terms";
import { BUYER_TERMS_VERSION } from "@/lib/constants";
import { PENDING_BUYER_TERMS_DECISIONS as pending } from "./decisions";

export const metadata: Metadata = { title: "Buyer terms" };

export default function BuyerTermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title="Buyer terms"
        intro="These terms apply to commercial cleaning companies (“you”) that buy walkthrough appointment credits from Something Clicks (“we”, “us”)."
      />
      <DraftTermsNotice version={BUYER_TERMS_VERSION} pending={pending} />
      <div className="prose-sc">
        <p className="text-sm text-zinc-500">Version {BUYER_TERMS_VERSION}</p>

        <h2>1. The service</h2>
        <p>
          Something Clicks connects businesses in the Salt Lake Valley, Utah, that have asked for a commercial cleaning
          walkthrough with commercial cleaning companies that serve their area. Businesses reach us through referral
          partners or directly, and each business agrees before its details are shared with a cleaning company.
        </p>
        <p>
          To buy credits, you need an approved buyer account. We review each company before approving it, and you keep
          your company details, service area, cleaning criteria, and walkthrough availability up to date in your
          account. We use that information to decide which walkthroughs are offered to you.
        </p>
        <p>
          By creating a buyer account you agree to these terms on behalf of your company. We record the version you
          agreed to and when.
        </p>
        <OwnerDecision id="terms-changes" decisions={pending} />

        <h2>2. Appointment credits</h2>
        <ul>
          <li>One credit pays for one walkthrough appointment.</li>
          <li>
            Credits are sold in packs shown on your dashboard. The price and number of credits are shown before you pay,
            and your purchase records what you paid. Changes to pack prices later do not affect past purchases.
          </li>
          <li>
            Credits are added to your balance only after our payment processor confirms your payment. Card payments are
            usually confirmed within seconds; bank payments can take several business days.
          </li>
          <li>Your dashboard shows your available credits, credits held for booked walkthroughs, and completed walkthroughs.</li>
        </ul>
        <OwnerDecision id="credit-expiry" decisions={pending} />

        <h3 className="mt-6 font-semibold">When a credit is held, used, or returned</h3>
        <ul>
          <li>
            <strong>Held (reserved):</strong> when a walkthrough is booked with your company, one credit moves from
            available to held. A walkthrough can only be booked with you if you have an available credit.
          </li>
          <li>
            <strong>Used (consumed):</strong> the held credit is used only when you confirm the walkthrough was
            completed, or when we resolve the appointment as completed after a review (see section 3).
          </li>
          <li>
            <strong>Returned (released):</strong> the held credit goes back to your available balance if the
            walkthrough does not happen because of a no-show or cancellation, or if we resolve the appointment as not
            completed after a review.
          </li>
        </ul>
        <p>A held credit is either used or returned once. It is never charged twice for the same appointment.</p>

        <h2>3. Reporting the outcome of each walkthrough</h2>
        <p>After each scheduled walkthrough, you agree to tell us what happened: completed, canceled, or missed (no-show).</p>
        <ul>
          <li>About 2 hours after the scheduled time, we email you secure links to report the outcome.</li>
          <li>If we have not heard from you after 24 hours, we send a reminder.</li>
          <li>
            If the outcome is still not reported after 48 hours, the appointment goes to review by our team and we let
            you know.
          </li>
        </ul>
        <p>
          <strong>Not responding never uses your credit on its own.</strong> If you do not report an outcome, your credit
          stays held until you report it or the appointment is resolved through review. No referral commission is
          created for an appointment just because you did not respond.
        </p>
        <p>
          During a review we may look at your report (if any), the appointment details and history, and the version of
          these terms that applied. We may also ask the business whether the walkthrough took place; the business&apos;s
          answer is considered as evidence, not as automatic proof. Every review decision is recorded with the reason
          and the evidence considered.
        </p>
        <OwnerDecision id="unanswered-resolution" decisions={pending} />

        <h2>4. Cancellations, no-shows, and disputes</h2>
        <ul>
          <li>
            <strong>The business cancels:</strong> report it as canceled. The held credit is returned to your balance.
          </li>
          <li>
            <strong>The business does not show up</strong> or is not available at the scheduled time: report it as a
            no-show. The held credit is returned to your balance. We may confirm what happened with the business.
          </li>
          <li>
            <strong>Your company cancels:</strong> tell us as soon as possible so the business can be told.
          </li>
        </ul>
        <OwnerDecision id="buyer-cancellation" decisions={pending} />
        <OwnerDecision id="no-show-evidence" decisions={pending} />
        <p>
          <strong>Disputes.</strong> If you believe an appointment should not use a credit, you can raise a dispute
          within the dispute window, which is 72 hours. We review disputes using the same evidence described in section 3
          and record the decision and reason.
        </p>
        <OwnerDecision id="dispute-rules" decisions={pending} />

        <h2>5. Payments and refunds</h2>
        <p>
          Payments are processed by Stripe through Stripe Checkout. We do not receive or store your full card or bank
          account details.
        </p>
        <OwnerDecision id="refund-unused" decisions={pending} />
        <OwnerDecision id="refund-credit-removal" decisions={pending} />

        <h2>6. Exclusivity and lead quality</h2>
        <p>
          Each walkthrough is offered to one cleaning company only. When a business books, it agrees that its details
          will be shared with one commercial cleaning company, and we do not share that booking with other buyers.
        </p>
        <OwnerDecision id="exclusivity-override" decisions={pending} />
        <p>
          The details about each business (such as property type, approximate size, cleaning frequency, decision-maker
          status, and contract end date) are provided by the business. We do not independently verify them.
        </p>
        <p>
          A walkthrough is an opportunity to meet a business and quote. We do not guarantee that a business will hire
          you, sign a contract, or buy any cleaning services, and we do not guarantee any amount of revenue or a minimum
          number of walkthroughs.
        </p>

        <h2>7. Using business information</h2>
        <p>
          Business contact details are shared with you so you can arrange the walkthrough, carry it out, and follow up
          about that walkthrough and your quote. You agree to:
        </p>
        <ul>
          <li>use the business&apos;s information only for that purpose;</li>
          <li>not sell it, share it with others, or add it to unrelated marketing; and</li>
          <li>keep it reasonably secure.</li>
        </ul>
        <p>
          See our <Link href="/privacy">Privacy page</Link> for how Something Clicks handles personal information.
        </p>

        <h2>8. Contact and support</h2>
        <p>For questions about these terms, a walkthrough, a dispute, or a refund, contact Something Clicks support.</p>
        <OwnerDecision id="support-contact" decisions={pending} />

        <OwnerDecision id="legal-review" decisions={pending} />
      </div>
    </div>
  );
}
