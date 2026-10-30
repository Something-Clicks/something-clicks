import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { P } from "@/components/Placeholder";
import { pilot } from "@/content/pilot";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Terms",
  path: "/terms",
  description: "Terms of use for somethingclicks.com and the Something Clicks Network founding pilot.",
});

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="[PLACEHOLDER: date]">
      <p>
        These terms govern your use of somethingclicks.com, operated by {site.legalName}, {site.region}. By using the
        site or submitting a form, you agree to them. Questions: <P value={site.contactEmail} />.
      </p>

      <h2>About the Network</h2>
      <p>
        The Something Clicks Network is a managed partnership network in a founding pilot. We coordinate partnerships
        between independent businesses; we are not a marketing agency, advertising seller, or influencer marketplace.
        The model is still being tested. <strong>We do not guarantee any results</strong>, including customers,
        inquiries, bookings, or revenue.
      </p>

      <h2>Applications</h2>
      <ul>
        <li>Submitting an application does not guarantee acceptance into the founding pilot or any future cycle.</li>
        <li>We may accept, waitlist, or decline any application at our discretion.</li>
        <li>You confirm that the information you submit is accurate and that you are authorized to submit it for your business.</li>
        <li>Do not submit customer lists or any personal information about your customers.</li>
      </ul>

      <h2>Founding pilot participation</h2>
      <ul>
        <li>
          The founding pilot is free for a limited first cycle (<P value={pilot.cycleLength} />). Any future pricing will
          be explained in writing before you are asked to commit to it.
        </li>
        <li>Participation in any partnership requires the agreement of both partner businesses. Either may decline.</li>
        <li>
          Each business is responsible for its own offers, pricing, services, and compliance with laws that apply to it,
          including advertising and consumer-protection laws.
        </li>
        <li>
          Partner promotions are disclosed relationships. Each business agrees to tell its customers clearly when it is
          sharing a partner&rsquo;s offer.
        </li>
        <li>[PLACEHOLDER: participation agreement details, such as term, termination, and confidentiality of briefs.]</li>
      </ul>

      <h2>Referral partners</h2>
      <p>
        Any reward or thank-you for introductions is possible only where permitted by law and applicable professional
        rules, and only under an individual written agreement. Nothing on this site is an offer of any specific
        commission or payment.
      </p>

      <h2>Site content</h2>
      <p>
        Examples on this site are illustrative and do not describe real members or results. Content is provided for
        general information and may change without notice.
      </p>

      <h2>Acceptable use</h2>
      <p>Do not misuse the site, including submitting spam, false information, or attempting to access the admin area.</p>

      <h2>Limitation of liability</h2>
      <p>[PLACEHOLDER: limitation of liability, disclaimer of warranties, and governing law (Utah) to be drafted by counsel.]</p>

      <h2>Privacy</h2>
      <p>
        See our <Link href="/privacy">Privacy Policy</Link> for how we handle information.
      </p>
    </LegalPage>
  );
}
