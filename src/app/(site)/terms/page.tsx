import Link from "next/link";
import { gaMeasurementId } from "@/components/GoogleAnalytics";
import { LegalPage } from "@/components/LegalPage";
import { P } from "@/components/Placeholder";
import { pilot } from "@/content/pilot";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Terms",
  path: "/terms",
  description: "Terms of use for somethingclicks.com and the Something Clicks Network.",
});

export default function TermsPage() {
  const ga = Boolean(gaMeasurementId());
  return (
    <LegalPage title="Terms of Use" updated="[PLACEHOLDER: date]">
      <p>
        These terms govern your use of somethingclicks.com (the &ldquo;site&rdquo;), operated by {site.legalName},{" "}
        {site.region}. By using the site or submitting a form, you agree to these terms and to our{" "}
        <Link href="/privacy">Privacy Policy</Link>. Questions: use our <Link href="/contact">contact form</Link>.
      </p>

      <h2>1. What Something Clicks does</h2>
      <p>
        Something Clicks coordinates partnerships between independent businesses whose customers overlap. We are not a
        marketing agency, advertising seller, or influencer marketplace. The model is still being tested.{" "}
        <strong>We do not guarantee any results</strong>, including customers, inquiries, bookings, or revenue.
      </p>

      <h2>2. Submissions</h2>
      <ul>
        <li>Submitting an application does not guarantee acceptance. We may accept, waitlist, or decline any application.</li>
        <li>You confirm that what you submit is accurate and that you are authorized to submit it for your business.</li>
        <li>Do not submit customer lists or any personal information about your customers.</li>
        <li>
          You allow us to use the business information you submit to review it, find potential partners, and share
          business-level details with a proposed partner as described in the Privacy Policy.
        </li>
      </ul>

      <h2>3. How we communicate with you</h2>
      <ul>
        <li>By submitting a form, you agree that we may contact you about it using the contact method you chose.</li>
        <li>We send occasional updates only if you opted in, and every update includes a way to unsubscribe.</li>
        <li>We share your contact details with another business only when you agree to that introduction.</li>
      </ul>

      <h2>4. Analytics and cookies</h2>
      <p>
        {ga
          ? "The site uses Google Analytics, which sets cookies, and Vercel Web Analytics, which does not, to understand how the site is used. "
          : "The site uses Vercel Web Analytics, which does not set cookies, to understand how the site is used. "}
        We also record anonymous form-activity counts and a short-lived hashed IP for spam prevention. We never send
        what you type into a form to analytics providers. Details{ga ? " and opt-out options" : ""} are in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>5. Participation</h2>
      <ul>
        <li>
          The first cycle is free (<P value={pilot.cycleLength} />). Any future pricing will be explained in writing
          before you are asked to commit to it.
        </li>
        <li>Any partnership requires the agreement of both businesses. Either may decline or end it.</li>
        <li>
          Each business is responsible for its own offers, pricing, services, and compliance with the laws that apply to
          it, including advertising and consumer-protection laws.
        </li>
        <li>
          Partner promotions are disclosed relationships. Each business agrees to tell its customers clearly when it is
          sharing a partner&rsquo;s offer.
        </li>
        <li>Collaboration briefs and results we share with you are for your business&rsquo;s use, not for publication without the partner&rsquo;s consent.</li>
        <li>[PLACEHOLDER: participation agreement details, such as term and termination.]</li>
      </ul>

      <h2>6. Referral partners</h2>
      <p>
        Any reward or thank-you for introductions is possible only where permitted by law and applicable professional
        rules, and only under an individual written agreement. Nothing on this site is an offer of any specific
        commission or payment.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        The site relies on service providers (Vercel, {ga ? "Google, " : ""}Supabase, Resend, and Cloudflare) as described in the
        Privacy Policy. Their services are governed by their own terms, and we are not responsible for their
        availability.
      </p>

      <h2>8. Site content</h2>
      <p>
        Examples on this site are illustrative and do not describe real members or results. Content is provided for
        general information and may change without notice. The site&rsquo;s design and text belong to{" "}
        {site.legalName}.
      </p>

      <h2>9. Acceptable use</h2>
      <p>
        Do not misuse the site. That includes submitting spam, false information, or automated submissions; scraping
        the site; interfering with its security; or attempting to access the admin area.
      </p>

      <h2>10. Disclaimers and limitation of liability</h2>
      <p>
        [PLACEHOLDER: disclaimer of warranties, limitation of liability, indemnity, and governing law (Utah) to be
        drafted by counsel.]
      </p>

      <h2>11. Changes</h2>
      <p>We may update these terms. We will post changes on this page and update the date above.</p>
    </LegalPage>
  );
}
