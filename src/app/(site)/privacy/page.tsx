import Link from "next/link";
import { gaMeasurementId } from "@/components/GoogleAnalytics";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Privacy Policy",
  path: "/privacy",
  description: "How Something Clicks collects, uses, shares, and protects information on somethingclicks.com.",
});

const ContactLink = () => (
  <Link href="/contact">contact form</Link>
);

export default function PrivacyPage() {
  // Google Analytics wording appears only when GA is actually configured.
  const ga = Boolean(gaMeasurementId());
  return (
    <LegalPage title="Privacy Policy" updated="[PLACEHOLDER: date]">
      <p>
        This policy explains how {site.legalName} (&ldquo;Something Clicks,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;),
        based in the {site.region}, handles information on somethingclicks.com (the &ldquo;site&rdquo;). Questions or
        requests: use our <ContactLink />.
      </p>

      <h2>1. Information you give us</h2>
      <ul>
        <li>
          <strong>Business applications:</strong> business name, website or social link, category, years in business,
          team size, and service areas; general descriptions of your customers&rsquo; needs; how you reach customers and
          approximate audience sizes; partnership interests, past cross-promotion experience, and available time; and
          your name, role, email, optional phone number, and preferred contact method.
        </li>
        <li>
          <strong>Referral partner interest:</strong> your name, organization, role, email, optional phone number, the
          types of businesses you could introduce, how you know them, and any notes.
        </li>
        <li>
          <strong>Contact messages:</strong> your name, email, topic, and message.
        </li>
        <li>
          <strong>Your choices:</strong> whether you agreed to be contacted (required to submit) and whether you opted
          in to occasional updates, with the time you agreed.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> ask for, and you should not submit, customer lists or any personal information about
        your customers.
      </p>

      <h2>2. Information collected automatically</h2>
      <ul>
        <li>
          <strong>Where you came from:</strong> when you submit a form, we save the page you submitted from, the website
          that referred you to us, and any campaign tags (UTM parameters) in the link you followed. Until you submit,
          these are held only in your browser&rsquo;s session storage, which clears when you close the tab.
        </li>
        <li>
          <strong>Application drafts:</strong> answers to the multi-step application are kept in your browser&rsquo;s
          session storage so you don&rsquo;t lose them if you reload. They are not sent to us until you submit, and they
          clear when you close the tab or submit.
        </li>
        {ga && (<li>
          <strong>Google Analytics:</strong> we use Google Analytics 4 to understand how people find and use the site
          (pages viewed, approximate location derived from IP address, device and browser type, referring site, and form
          events such as &ldquo;form started&rdquo; and &ldquo;form submitted&rdquo;). Google Analytics sets cookies
          (such as <code>_ga</code>) to recognize returning browsers. We have turned off Google signals and ad
          personalization, and we never send what you type into a form to Google. Google processes this data under its
          own terms; see{" "}
          <a href="https://policies.google.com/technologies/partner-sites" rel="noopener noreferrer">
            how Google uses information from sites that use its services
          </a>
          . You can opt out with the{" "}
          <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer">
            Google Analytics opt-out browser add-on
          </a>{" "}
          or by blocking cookies in your browser.
        </li>)}
        <li>
          <strong>Vercel Web Analytics:</strong> our host counts page views in aggregate without cookies.
        </li>
        <li>
          <strong>Form activity counts:</strong> we record anonymous events (form started, step reached, form submitted)
          with the page and campaign tags but no personal information, to see where forms are hard to finish.
        </li>
        <li>
          <strong>Spam prevention:</strong> to limit abuse, we store a one-way, salted hash of your IP address with a
          counter. We never store the IP address itself, and these records are deleted automatically within about a day.
          Forms also include a hidden field and a timing check to filter out bots.
        </li>
        <li>
          <strong>Server logs:</strong> like any website host, Vercel records technical request data (such as IP address,
          browser type, and pages requested) for security and reliability.
        </li>
      </ul>

      <h2>3. Cookies and similar technologies</h2>
      <ul>
        {ga && (<li>
          <strong>Analytics cookies:</strong> set by Google Analytics as described above.
        </li>)}
        <li>
          <strong>Session storage:</strong> used for campaign tags and application drafts, as described above. It never
          leaves your browser unless you submit a form.
        </li>
        <li>
          <strong>Administrator sign-in:</strong> a secure session cookie is set only for our site administrator.
        </li>
      </ul>
      <p>
        {ga ? "" : "Visitors receive no cookies from us. "}We do not use advertising cookies or allow third parties to
        place advertising trackers on the site.
      </p>

      <h2>4. How we use information</h2>
      <ul>
        <li>To review applications and inquiries, and to contact you about them by your preferred method.</li>
        <li>
          To identify potential partner matches. We share business-level details (for example, your business name,
          category, and service area) with a proposed partner only after telling you, and we share your contact details
          with a partner only when you agree to the introduction.
        </li>
        <li>To send occasional updates, only if you opted in. Every update includes a way to unsubscribe.</li>
        <li>To understand, in aggregate, which pages and campaigns bring people to the site and where forms are hard to finish.</li>
        <li>To keep the site secure and prevent spam and abuse.</li>
      </ul>
      <p>
        We do not sell personal information, and we do not share it for targeted advertising.
      </p>

      <h2>5. Who we share it with</h2>
      <p>We use a small number of service providers that process information on our behalf:</p>
      <ul>
        <li>
          <strong>Vercel</strong>: website hosting and cookieless page-view analytics.
        </li>
        {ga && (<li>
          <strong>Google</strong>: Google Analytics, as described above.
        </li>)}
        <li>
          <strong>Supabase</strong>: our database, where submissions are stored, and administrator sign-in.
        </li>
        <li>
          <strong>Resend</strong>: delivers email notifications of new submissions to our team. Those emails contain the
          contents of your submission.
        </li>
        <li>
          <strong>Cloudflare</strong>: domain name (DNS) services. It does not receive form contents.
        </li>
      </ul>
      <p>
        [PLACEHOLDER: confirm each provider&rsquo;s data-processing terms and storage regions.] We may also disclose
        information if required by law, or to protect our rights, users, or the public, or as part of a sale or
        reorganization of our business.
      </p>

      <h2>6. Retention</h2>
      <p>
        We keep submissions for as long as needed to review them and provide our services, then delete or anonymize
        them. [PLACEHOLDER: set a specific retention period.] Hashed IP records are deleted within about a day.
        Anonymous form-activity counts may be kept longer.
        {ga && " Google Analytics data is retained according to the setting in our Google Analytics account [PLACEHOLDER: e.g., 14 months]."}
      </p>

      <h2>7. Your choices and rights</h2>
      <ul>
        <li>
          Ask to see, correct, or delete the information you submitted, or withdraw your consent to be contacted, using
          our <ContactLink />.
        </li>
        <li>Unsubscribe from updates using the link in any update email.</li>
        {ga && <li>Opt out of Google Analytics using Google&rsquo;s opt-out add-on or your browser&rsquo;s cookie settings.</li>}
      </ul>
      <p>[PLACEHOLDER: add any state-specific rights that apply.]</p>

      <h2>8. Security</h2>
      <p>
        Information is sent over encrypted connections (HTTPS) and stored in a database that only our server and our
        administrator can access. No method of transmission or storage is completely secure.
      </p>

      <h2>9. Children</h2>
      <p>The site is intended for business owners and professionals. It is not directed to children under 16.</p>

      <h2>10. Changes</h2>
      <p>We will post any changes on this page and update the date above.</p>
    </LegalPage>
  );
}
