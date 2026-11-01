import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Terms",
  path: "/terms",
  description: "Terms of use for somethingclicks.com and the Something Clicks network.",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" version="1.0" effective="October 31, 2026" updated="October 31, 2026">
      <p>
        These terms are an agreement between you and {site.legalName} (&ldquo;Something Clicks,&rdquo; &ldquo;we&rdquo;
        or &ldquo;us&rdquo;) for using somethingclicks.com (the &ldquo;site&rdquo;). By using the site, creating an
        account or buying a plan, you agree to these terms and to our <Link href="/privacy">Privacy Policy</Link>. If you
        don&rsquo;t agree, please don&rsquo;t use the site.
      </p>

      <h2>1. What Something Clicks does</h2>
      <p>
        Something Clicks helps wedding businesses find complementary local businesses, request introductions, and build
        referral partnerships. We are not a marketing agency, an advertising seller or a booking service.
      </p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>You must be at least 18 and using the site for a business.</li>
        <li>You sign in with links we email you. Keep your email account secure and don&rsquo;t share sign-in links.</li>
        <li>You&rsquo;re responsible for activity on your account. Tell us through our <Link href="/contact">contact page</Link> if you think someone else has used it.</li>
      </ul>

      <h2>3. Claiming a business</h2>
      <ul>
        <li>Claim only a business you own or are authorized to represent. Each business has one owner on Something Clicks.</li>
        <li>We may ask for evidence, and we may decline, transfer or remove a claim, for example if someone shows a better right to the business.</li>
        <li>Keep your business information accurate and up to date. You confirm that what you submit is true and that you&rsquo;re allowed to submit it.</li>
        <li>You let us use the business information you submit to run the service, including showing your business to the verified owners of businesses it fits.</li>
      </ul>

      <h2>4. Listings and matches</h2>
      <ul>
        <li>
          Listings come from public data (see <Link href="/data-sources">Data sources</Link>) and may be incomplete or
          out of date. A listed business isn&rsquo;t a member unless its owner has joined. Anyone can ask us to remove a
          listing at <Link href="/remove-my-business">Remove my business</Link>.
        </li>
        <li>Matches are suggestions based on business categories and distance. They are not endorsements of any business.</li>
        <li><strong>We don&rsquo;t guarantee any referrals, introductions, bookings, customers or revenue.</strong></li>
        <li>Paying for a plan never changes who you&rsquo;re matched with or how matches are ordered.</li>
      </ul>

      <h2>5. Introductions and partnerships</h2>
      <ul>
        <li>An introduction needs both businesses to accept. Contact details are shared only after both accept.</li>
        <li>
          Partnerships are agreements between the businesses involved. We aren&rsquo;t a party to them and aren&rsquo;t
          responsible for either business&rsquo;s offers, services, pricing or conduct.
        </li>
        <li>Either business may decline or end an introduction or partnership at any time.</li>
        <li>
          When you promote a partner&rsquo;s offer, you must clearly disclose the relationship to your customers, as the
          FTC&rsquo;s Endorsement Guides and similar laws require. Each business is responsible for following the
          advertising, consumer-protection and privacy laws that apply to it.
        </li>
        <li>Use contact details you receive through an introduction only to work with that business.</li>
      </ul>

      <h2>6. Plans and payments</h2>
      <p>
        Claiming your business, seeing your matches, requesting introductions and using tracking links are free. Paid
        plans are optional and are processed by Stripe. Prices are in U.S. dollars and don&rsquo;t include any taxes that
        may apply.
      </p>
      <h3>Membership: $149 per month</h3>
      <ul>
        <li>Billed monthly through Stripe, starting the day you subscribe, and renews automatically until you cancel.</li>
        <li>Cancel anytime from <strong>Manage billing</strong> on your dashboard&rsquo;s Plans page.</li>
        <li>When you cancel, your membership continues until the end of the period you&rsquo;ve paid for, then stops. We don&rsquo;t refund partial months.</li>
        <li>We&rsquo;ll give you at least 30 days&rsquo; notice by email before any price change applies to you.</li>
      </ul>
      <h3>Managed Campaign: $299</h3>
      <ul>
        <li>Paid in full in advance.</li>
        <li>Refundable in full if you ask before we begin work on your campaign. Once work has begun, it isn&rsquo;t refundable.</li>
        <li>We&rsquo;ll confirm the campaign plan with you. Results depend on the businesses involved and aren&rsquo;t guaranteed.</li>
      </ul>
      <p>
        Referral links: if someone referred you through a referral link, we may share that a purchase was made with our
        referral provider so the referrer can be credited. This doesn&rsquo;t change your price.
      </p>

      <h2>7. Planner Partners</h2>
      <p>
        The Planner Partner program is governed by the{" "}
        <Link href="/planner-partners/agreement">Planner Partner Agreement</Link>, which you accept separately when you
        apply. If it conflicts with these terms, the Agreement controls for the program.
      </p>

      <h2>8. Acceptable use</h2>
      <p>Don&rsquo;t:</p>
      <ul>
        <li>submit false information, claim a business you aren&rsquo;t authorized to represent, or impersonate anyone;</li>
        <li>send spam, or use the site to contact businesses that haven&rsquo;t accepted an introduction;</li>
        <li>scrape, copy or resell listings, matches or other site data;</li>
        <li>interfere with the site&rsquo;s security or operation, or try to access accounts or areas you aren&rsquo;t allowed to;</li>
        <li>use the site for anything unlawful, deceptive or harmful.</li>
      </ul>

      <h2>9. Suspension and ending your account</h2>
      <p>
        You can stop using the site and ask us to delete your account at any time. We may suspend or close an account,
        remove a claim, or end a partnership on the site if you break these terms, if we&rsquo;re required to by law, or
        to protect other users.
      </p>

      <h2>10. Our content</h2>
      <p>
        The site&rsquo;s design, text and software belong to {site.legalName} or its licensors. You keep ownership of the
        information you submit. Examples on the site are illustrative and don&rsquo;t describe real members or results.
      </p>

      <h2>11. Disclaimers</h2>
      <p>
        The site and all services are provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest extent
        the law allows, we disclaim all warranties, express or implied, including warranties of merchantability, fitness
        for a particular purpose and non-infringement. We don&rsquo;t promise the site will be uninterrupted, error-free
        or that listings are accurate, and we don&rsquo;t vouch for any business on it.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, Something Clicks won&rsquo;t be liable for any indirect, incidental,
        special, consequential or punitive damages, or for lost profits, revenue, bookings or data, arising from your use
        of the site or from dealings between businesses. Our total liability for any claim relating to the site is
        limited to the greater of the amount you paid us in the 12 months before the claim or $100. Some places
        don&rsquo;t allow these limits, so they may not all apply to you.
      </p>

      <h2>13. Indemnity</h2>
      <p>
        If someone brings a claim against us because of information you submitted, your partnerships or promotions, or
        your breach of these terms, you agree to cover our reasonable costs and losses from that claim.
      </p>

      <h2>14. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Utah, without regard to its conflict-of-law rules. Any
        dispute will be resolved in the state or federal courts located in Salt Lake County, Utah, and you and we consent
        to their jurisdiction.
      </p>

      <h2>15. Changes to these terms</h2>
      <p>
        We may update these terms. We&rsquo;ll post the new version here with a new date, and for significant changes
        we&rsquo;ll email account holders at least 30 days before they take effect. If you keep using the site after
        changes take effect, you accept them. If you don&rsquo;t, you can cancel any plan and close your account.
      </p>

      <h2>16. Contact</h2>
      <p>
        {site.legalName}. Questions about these terms: our <Link href="/contact">contact page</Link>.
      </p>
    </LegalPage>
  );
}
