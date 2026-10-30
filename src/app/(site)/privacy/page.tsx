import Link from "next/link";
import { gaMeasurementId } from "@/components/GoogleAnalytics";
import { LegalPage } from "@/components/LegalPage";
import { P } from "@/components/Placeholder";
import { placeholder, site } from "@/content/site";
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
        This policy explains how {site.legalName} (&ldquo;Something Clicks,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
        handles information on somethingclicks.com (the &ldquo;site&rdquo;). Questions or requests: use our <ContactLink />.
      </p>

      <h2>1. Information you give us</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address, used to sign in with emailed links. We store only a
          one-way hash of each link, and links expire after an hour.
        </li>
        <li>
          <strong>Claiming or adding a business:</strong> the business you claim, the email you claim it with, and any
          note you add to help us confirm it. If you add a business we don&rsquo;t list, its name, category, website,
          city, and the area you serve.
        </li>
        <li>
          <strong>Your profile:</strong> a short description, the area you serve, a contact name, email and phone, and
          whether you&rsquo;ve joined the network.
        </li>
        <li>
          <strong>Introductions and partnerships:</strong> who you asked to connect with, any note you added, their
          answer, and the details of any partnership you set up (the offer, an optional code and link).
        </li>
        <li>
          <strong>Earlier applications:</strong> if you applied before claiming replaced applications, we keep what you
          submitted as described in this policy.
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
          <strong>Partner link visits:</strong> when someone follows a partner tracking link, we add one to that
          link&rsquo;s visit count. We don&rsquo;t record who followed it.
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
          <strong>Session storage:</strong> used for campaign tags, as described above. It never leaves your browser
          unless you submit a form.
        </li>
        <li>
          <strong>Sign-in:</strong> when you sign in, a secure session cookie keeps you signed in for up to 30 days. Our
          site administrator has a separate one.
        </li>
      </ul>
      <p>
        {ga ? "" : "Visitors who don't sign in receive no cookies from us. "}We do not use advertising cookies or allow third parties to
        place advertising trackers on the site.
      </p>

      <h2>4. Public business listings</h2>
      <p>
        Most businesses on Something Clicks come from public business listings published by the Overture Maps
        Foundation (see <Link href="/data-sources">Data sources</Link>): business name, category, address, phone,
        website, and sometimes a business email address. We use them to show anonymous counts by category and distance,
        and to show a claimed business which businesses fit theirs. We never publish a directory, we never show a
        listing as a member until its owner joins, and we never show an imported email address to anyone.
      </p>
      <p>
        If we email a listed business about Something Clicks, the message will say who we are, include our postal
        address and a one-click unsubscribe, and we stop as soon as anyone opts out. Anyone can ask us to remove a
        listing at <Link href="/remove-my-business">Remove my business</Link>; we hide it and keep it out of future
        updates.
      </p>
      <p>
        <P value={placeholder("[Legal review] Before AI enrichment starts, describe it here and add Anthropic as a service provider.")} />
      </p>

      <h2>5. How we use information</h2>
      <ul>
        <li>To review applications and inquiries, and to contact you about them by your preferred method.</li>
        <li>
          To show you businesses that fit yours, and to show your business (name, category, city and distance) to the
          businesses it fits once you&rsquo;ve claimed it.
        </li>
        <li>
          To make introductions. Your contact details are shared with another business only when you have both
          accepted the introduction.
        </li>
        <li>To email you sign-in links and notices about your claim, introductions and partnerships.</li>
        <li>To send occasional updates, only if you opted in. Every update includes a way to unsubscribe.</li>
        <li>To understand, in aggregate, which pages and campaigns bring people to the site and where forms are hard to finish.</li>
        <li>To keep the site secure and prevent spam and abuse.</li>
      </ul>
      <p>
        We do not sell personal information, and we do not share it for targeted advertising.
      </p>

      <h2>6. Who we share it with</h2>
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
          <strong>Resend</strong>: delivers our email, including sign-in links, notices to you, and notifications of new
          submissions to our team (which contain the contents of the submission).
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

      <h2>7. Retention</h2>
      <p>
        We keep submissions for as long as needed to review them and provide our services, then delete or anonymize
        them. [PLACEHOLDER: set a specific retention period.] Hashed IP records and used or expired sign-in links are deleted within about a day. When a business is removed, we
        keep its listing ID, website domain and phone on a do-not-list record so it stays removed.
        Anonymous form-activity counts may be kept longer.
        {ga && " Google Analytics data is retained according to the setting in our Google Analytics account [PLACEHOLDER: e.g., 14 months]."}
      </p>

      <h2>8. Your choices and rights</h2>
      <ul>
        <li>
          Ask to see, correct, or delete the information you submitted, or withdraw your consent to be contacted, using
          our <ContactLink />.
        </li>
        <li>Unsubscribe from updates using the link in any update email.</li>
        <li>Leave the network at any time from your profile, or ask us to delete your account.</li>
        <li>Ask us to remove a business listing at <Link href="/remove-my-business">Remove my business</Link>.</li>
        {ga && <li>Opt out of Google Analytics using Google&rsquo;s opt-out add-on or your browser&rsquo;s cookie settings.</li>}
      </ul>
      <p>[PLACEHOLDER: add any state-specific rights that apply.]</p>

      <h2>9. Security</h2>
      <p>
        Information is sent over encrypted connections (HTTPS) and stored in a database that only our server and our
        administrator can access. No method of transmission or storage is completely secure.
      </p>

      <h2>10. Children</h2>
      <p>The site is intended for business owners and professionals. It is not directed to children under 16.</p>

      <h2>11. Changes</h2>
      <p>We will post any changes on this page and update the date above.</p>
    </LegalPage>
  );
}
