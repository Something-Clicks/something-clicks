import { LegalPage } from "@/components/LegalPage";
import { P } from "@/components/Placeholder";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Privacy Policy",
  path: "/privacy",
  description: "How Something Clicks collects, uses, and protects information submitted through somethingclicks.com.",
});

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="[PLACEHOLDER: date]">
      <p>
        This policy explains how {site.legalName} (&ldquo;Something Clicks,&rdquo; &ldquo;we&rdquo;) handles information
        submitted through somethingclicks.com. Questions: <P value={site.contactEmail} />.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Founding-member applications:</strong> business details (name, website, category, size, service
          area), descriptions of your customers&rsquo; needs and your marketing channels, partnership interests, capacity,
          and your contact details (name, role, email, optional phone, preferred contact method).
        </li>
        <li>
          <strong>Referral partner interest:</strong> your name, organization, role, email, optional phone, and notes
          about the businesses you could introduce.
        </li>
        <li>
          <strong>Contact messages:</strong> your name, email, topic, and message.
        </li>
        <li>
          <strong>Context about the submission:</strong> the page you submitted from, the referring page, and campaign
          (UTM) tags in the link you followed, plus the consent choices you made.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> ask for, and you should not submit, customer lists or any personal information about
        your customers.
      </p>

      <h2>Information collected automatically</h2>
      <ul>
        <li>
          <strong>Analytics:</strong> we use Cloudflare Web Analytics, which counts page views without cookies and
          without tracking you across sites. We also record anonymous form events (for example, &ldquo;application
          started&rdquo; and &ldquo;application submitted&rdquo;) that contain no personal information.
        </li>
        <li>
          <strong>Spam prevention:</strong> to limit abuse, we store a one-way hashed version of your IP address for a
          short period. We do not store the IP address itself.
        </li>
        <li>
          <strong>Admin sign-in:</strong> the only cookie we set is a session cookie for our site administrator. Visitors
          receive no cookies from us.
        </li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To review applications, contact you about your submission, and run the founding pilot.</li>
        <li>To identify potential partner matches. We share business-level details with a proposed partner only after telling you.</li>
        <li>To send occasional Network updates, only if you opted in. You can unsubscribe at any time.</li>
        <li>To understand which pages and campaigns bring people to the site, in aggregate.</li>
      </ul>
      <p>We do not sell personal information.</p>

      <h2>Service providers</h2>
      <p>
        We use a small number of providers to run the site: Cloudflare (hosting and analytics), Supabase (database), and
        Resend (email notifications to our team). They process information on our behalf under their own security and
        privacy terms. [PLACEHOLDER: confirm data-processing terms and storage regions.]
      </p>

      <h2>Retention</h2>
      <p>
        We keep submissions for as long as needed to run the pilot and future cycles, then delete or anonymize them.
        [PLACEHOLDER: set a specific retention period.] Hashed IP records used for spam prevention are deleted
        automatically within [PLACEHOLDER: X days].
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to access, correct, or delete the information you submitted by emailing{" "}
        <P value={site.contactEmail} />. [PLACEHOLDER: add any state-specific rights that apply.]
      </p>

      <h2>Security</h2>
      <p>
        Submissions are sent over encrypted connections and stored in a database that is accessible only to our
        server and our administrator. No method of transmission or storage is completely secure.
      </p>

      <h2>Children</h2>
      <p>This site is intended for business owners and professionals. It is not directed to children under 16.</p>

      <h2>Changes</h2>
      <p>We will post any changes on this page and update the date above.</p>
    </LegalPage>
  );
}
