import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site-chrome";
import { DraftTermsNotice, OwnerDecision } from "@/components/terms";
import { PARTNER_TERMS_VERSION } from "@/lib/constants";
import { PENDING_PARTNER_TERMS_DECISIONS as pending } from "./decisions";

export const metadata: Metadata = { title: "Partner terms" };

export default function PartnerTermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title="Referral partner terms"
        intro="These terms apply to referral partners (“you”) who introduce businesses that may need commercial cleaning to Something Clicks (“we”, “us”)."
      />
      <DraftTermsNotice version={PARTNER_TERMS_VERSION} pending={pending} />
      <div className="prose-sc">
        <p className="text-sm text-zinc-500">Version {PARTNER_TERMS_VERSION}</p>

        <h2>1. The partner program</h2>
        <p>
          Something Clicks connects businesses in the Salt Lake Valley, Utah, that want a commercial cleaning walkthrough
          with one commercial cleaning company that serves their area. Partners introduce businesses to us and can earn a
          commission when a referral meets every requirement in section 6.
        </p>
        <p>
          You apply through our partner page and agree to these terms when you apply. We record the version you agreed to
          and when. We review every application and may decline one. Approved partners receive a personal referral link.
        </p>
        <OwnerDecision id="terms-changes" decisions={pending} />

        <h2>2. Consent and permission</h2>
        <ul>
          <li>
            Only refer a business after someone authorized to speak for it has agreed that you may pass its details to
            Something Clicks and that a cleaning company may contact it.
          </li>
          <li>
            Do not tell a business, or us, that it has agreed to a walkthrough when it has not. The business confirms its
            own details and gives its own consent before anything is shared with a cleaning company.
          </li>
          <li>
            Describe Something Clicks accurately. Do not claim to work for or speak for Something Clicks or any cleaning
            company, and do not make promises about prices, quotes, or results on anyone&apos;s behalf.
          </li>
        </ul>

        <h2>3. Prohibited outreach</h2>
        <p>You must not promote your referral link or Something Clicks through:</p>
        <ul>
          <li>spam, or unsolicited bulk email or text message campaigns;</li>
          <li>purchased, rented, or scraped contact lists;</li>
          <li>deceptive or misleading messages, including false urgency or posing as a business&apos;s existing vendor;</li>
          <li>automated outreach (such as bots or auto-dialers) that breaks applicable law or these terms.</li>
        </ul>
        <p>
          You are responsible for following the privacy and marketing laws that apply to your outreach, including laws on
          commercial email, text messages, and phone calls.
        </p>

        <h2>4. Self-referrals and conflicts of interest</h2>
        <ul>
          <li>
            You may not refer your own business, or a business you own or control, in order to earn a commission.
          </li>
          <li>
            Referrals of businesses connected to you (for example, a family member&apos;s business, your employer, or a
            company you have a financial interest in) may be reviewed before they qualify. Tell us about the connection
            when you refer.
          </li>
          <li>We may check for self-referrals, for example by comparing email domains.</li>
        </ul>

        <h2>5. Referral eligibility and attribution</h2>
        <p>
          <strong>Referral links.</strong> When a business opens your referral link, our site remembers your referral code
          in that browser for 90 days. If the business requests a walkthrough from that browser within those 90 days, the
          request is attributed to you. If the business had already opened another partner&apos;s link that is still
          within its 90 days, the first link counts.
        </p>
        <p>
          <strong>Businesses already in our system.</strong> A business that already has an open walkthrough request with
          us stays attributed to its first valid referral. We match businesses by email address and by business address.
          A later referral of the same business is treated as a duplicate and does not earn a commission; we will tell
          you it is a duplicate, but not who referred it first. A business whose earlier request was rejected or expired
          can be referred again.
        </p>
        <p>
          <strong>Referring a business directly.</strong> When you submit a business yourself, we email the business so it
          can confirm its details and book. A submission alone never creates an appointment, and an unconfirmed submission
          expires after 14 days, with one reminder to the business before then.
        </p>
        <p>
          Where attribution is unclear or two referrals conflict, we resolve it individually and record the decision.
        </p>
        <OwnerDecision id="attribution-conflicts" decisions={pending} />

        <h2>6. When a commission is earned</h2>
        <p>A commission is earned only when all of the following are true:</p>
        <ol className="mt-3 list-decimal pl-6">
          <li>the referral is valid under these terms and attributed to you;</li>
          <li>the business gave permission to be contacted and confirmed its own request;</li>
          <li>the cleaning company actually completed the walkthrough;</li>
          <li>the dispute window for that walkthrough has closed without the walkthrough being disputed successfully; and</li>
          <li>
            the cleaning company&apos;s credit for that walkthrough has been used under our{" "}
            <Link href="/terms/buyer">Buyer Terms</Link>.
          </li>
        </ol>
        <p>
          A referral submission, a request, or a booking does not earn a commission by itself. Nor does a walkthrough whose
          outcome was never reported: if a cleaning company does not respond, no commission is created unless the
          appointment is later confirmed as completed through our review process. Something Clicks pays commissions only
          for walkthroughs a cleaning company has paid for.
        </p>
        <p>Each completed walkthrough earns at most one commission.</p>
        <OwnerDecision id="commission-amount" decisions={pending} />
        <OwnerDecision id="monthly-cap" decisions={pending} />

        <h2>7. Review, rejection, and voided referrals</h2>
        <p>
          We review referrals, and we may manually review a new partner&apos;s early referrals more closely. We may reject
          a referral, or void a commission that has not yet been paid, if we reasonably determine that the referral:
        </p>
        <ul>
          <li>does not meet the requirements in sections 5 and 6, or is a duplicate;</li>
          <li>was made without the business&apos;s permission;</li>
          <li>is a self-referral, or came from prohibited outreach under section 3;</li>
          <li>is fraudulent or based on false information; or</li>
          <li>involves a walkthrough that was disputed successfully under the Buyer Terms.</li>
        </ul>
        <p>
          We make these decisions in good faith based on the information available to us, record the reason, and tell you
          when one of your referrals is rejected, marked as a duplicate, or voided. Repeated or serious violations can lead
          to suspension from the program.
        </p>
        <OwnerDecision id="review-requests" decisions={pending} />
        <OwnerDecision id="commission-reversal" decisions={pending} />

        <h2>8. What you can see</h2>
        <p>
          On our site you can see the business name and status of each of your referrals. We do not share a referred
          business&apos;s contact details with you unless the business agrees.
        </p>
        <OwnerDecision id="partner-portal-data" decisions={pending} />

        <h2>9. Payouts</h2>
        <p>Something Clicks never pays out money it has not collected from a cleaning company for that walkthrough.</p>
        <OwnerDecision id="payouts" decisions={pending} />

        <h2>10. Ending the partnership</h2>
        <OwnerDecision id="suspension-effects" decisions={pending} />

        <h2>11. Privacy</h2>
        <p>
          We use your application details to review your application, run the partner program, and contact you about it.
          See our <Link href="/privacy">Privacy page</Link>.
        </p>

        <h2>12. Contact and support</h2>
        <p>For questions about these terms or a referral decision, contact Something Clicks support.</p>
        <OwnerDecision id="support-contact" decisions={pending} />

        <OwnerDecision id="legal-review" decisions={pending} />
      </div>
    </div>
  );
}
