import Link from "next/link";
import { gaMeasurementId } from "@/components/GoogleAnalytics";
import { LegalPage } from "@/components/LegalPage";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Privacy Policy",
  path: "/privacy",
  description: "How Something Clicks collects, uses, shares and protects information.",
});

const Contact = () => <Link href="/contact">contact page</Link>;

export default function PrivacyPage() {
  // Google Analytics wording appears only when GA is actually configured.
  const ga = Boolean(gaMeasurementId());
  return (
    <LegalPage title="Privacy Policy" version="1.1" effective="November 1, 2026" updated="November 1, 2026">
      <p>
        This policy explains what information {site.legalName} (&ldquo;Something Clicks,&rdquo; &ldquo;we&rdquo; or
        &ldquo;us&rdquo;) collects through somethingclicks.com (the &ldquo;site&rdquo;), how we use it, who we share it
        with, and the choices you have. If you have a question or request, reach us through our <Contact />.
      </p>

      <h2>1. Information you give us</h2>
      <ul>
        <li>
          <strong>Your account.</strong> Your email address. You sign in with a link we email you; we store only a
          one-way hash of each link, and links expire after an hour.
        </li>
        <li>
          <strong>Your business.</strong> The business you claim and the email you claim it with, any note you add to
          help us confirm it, and, if you add a business we don&rsquo;t list, its name, category, website, city and
          service area. Your profile: a short description, service area, contact name, email and phone, and whether
          you&rsquo;ve joined the network.
        </li>
        <li>
          <strong>Introductions and partnerships.</strong> Who you asked to meet, any note you added, their answer, and
          the details of partnerships you set up (the offer, an optional code and link).
        </li>
        <li>
          <strong>Planner Partners.</strong> If you apply, your acceptance of the Planner Partner Agreement (the version,
          the time, your account and business, and the IP address you accepted from). If you suggest businesses to
          invite, the names, categories, cities and email addresses you give us for them. We email those businesses only
          after we review and approve each invitation.
        </li>
        <li>
          <strong>Payments.</strong> If you buy a plan, the plan, amounts, dates and status of your payments, and the
          Stripe customer and subscription IDs that link them to your business. Stripe collects your card details; we
          never see or store card numbers.
        </li>
        <li>
          <strong>Forms.</strong> Contact messages (name, email, topic, message), referral partner interest (name,
          organization, role, email, optional phone, and the businesses you could introduce), and removal requests.
          Whether you agreed to be contacted and whether you opted in to updates, with the time.
        </li>
        <li>
          <strong>Your public profile (vendors).</strong> If you choose to show your profile to couples: your about text,
          price range, the markets you serve, styles, and portfolio photos with their descriptions. These are public for as
          long as that setting is on. Only upload photos you have the right to share.
        </li>
        <li>
          <strong>Inquiries (couples).</strong> When you send a vendor an inquiry: your name and email, and if you give
          them, your phone number, wedding date, city or venue, guest count, budget range and message, plus the time you
          agreed to have them sent to that vendor.
        </li>
        <li>
          <strong>Searches.</strong> When a search for &ldquo;What you do&rdquo; doesn&rsquo;t match a category we know,
          we save that phrase (not who typed it) so we can add the category.
        </li>
      </ul>
      <p>
        Please don&rsquo;t send us customer lists or personal information about your customers. We don&rsquo;t ask for
        it.
      </p>

      <h2>2. Information collected automatically</h2>
      <ul>
        <li>
          <strong>Profile views and inquiry sources.</strong> When someone views a public vendor profile, we add one to
          that profile&rsquo;s count for the day, together with how they found it (for example, from another
          vendor&rsquo;s &ldquo;Works well with&rdquo; list or a partner&rsquo;s link). Inquiries record the same. We
          don&rsquo;t record who viewed a profile.
        </li>
        <li>
          <strong>Tracking-link visits.</strong> When someone follows a partner&rsquo;s tracking link, we add one to that
          link&rsquo;s visit count. We don&rsquo;t record who followed it.
        </li>
        <li>
          <strong>Where you came from.</strong> When you submit a form, the page you submitted from, the site that
          referred you, and any campaign tags in the link you followed. Until you submit, these stay in your
          browser&rsquo;s session storage.
        </li>
        <li>
          <strong>Rate limiting.</strong> To stop spam and abuse, we store a salted, one-way hash of your IP address
          with a counter. We never store the IP address itself for this, and these records are deleted within about a
          day.
        </li>
        <li>
          <strong>Analytics.</strong> Vercel Web Analytics counts page views in aggregate without cookies.
          {ga &&
            " Google Analytics records pages viewed, approximate location from your IP address, device and browser type, the referring site, and form events such as “form started.” Google signals and ad personalization are off, and we never send what you type into a form to Google."}{" "}
          We also count anonymous form events (started, step reached, submitted) with no personal information.
        </li>
        <li>
          <strong>Server logs.</strong> Our host records technical request data, such as IP address, browser type and
          pages requested, for security and reliability.
        </li>
      </ul>

      <h2>3. Cookies</h2>
      <ul>
        <li>
          <strong>Session.</strong> When you sign in, a secure cookie keeps you signed in for up to 30 days.
        </li>
        <li>
          <strong>Referral.</strong> PromoteKit sets a cookie to remember which referral link, if any, brought you to the
          site, so the referrer can be credited if you later buy a plan.
        </li>
        {ga && (
          <li>
            <strong>Analytics.</strong> Google Analytics sets cookies (such as <code>_ga</code>) to recognize returning
            browsers. You can opt out with the{" "}
            <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener noreferrer">
              Google Analytics opt-out add-on
            </a>{" "}
            or your browser&rsquo;s cookie settings.
          </li>
        )}
      </ul>
      <p>We don&rsquo;t use advertising cookies or let third parties place advertising trackers on the site.</p>

      <h2>4. Business listings</h2>
      <p>
        Most businesses on Something Clicks come from public business data published by the Overture Maps Foundation
        (see <Link href="/data-sources">Data sources</Link>): name, category, address, phone, website and sometimes a
        business email. We use it to show anonymous counts of businesses by category and distance, and to show verified
        owners which businesses fit theirs.
      </p>
      <ul>
        <li>The public never sees the name of an unclaimed business, only counts.</li>
        <li>We never show an imported email address to anyone.</li>
        <li>
          If we email a listed business, the message says who we are, includes our postal address and a one-click
          unsubscribe, and we stop as soon as anyone opts out.
        </li>
        <li>
          Anyone can ask us to remove a listing at <Link href="/remove-my-business">Remove my business</Link>. We hide it
          and keep it out of future data updates.
        </li>
      </ul>

      <h2>5. Couples and public vendor profiles</h2>
      <ul>
        <li>
          A vendor&rsquo;s profile is shown to couples only if the vendor is verified and has turned on &ldquo;Show my
          profile to couples.&rdquo; They can turn it off at any time.
        </li>
        <li>
          &ldquo;Works well with&rdquo; lists only businesses a vendor has a partnership with on Something Clicks, and only
          if those businesses also show their profiles to couples.
        </li>
        <li>
          <strong>Your inquiry goes only to the vendor you send it to.</strong> We email it to them and show it on their
          dashboard, and we email you a copy. We don&rsquo;t share it with other vendors, sell it, or use it for
          advertising.
        </li>
        <li>
          Once a vendor receives your inquiry, they may contact you about it and handle your details under their own
          practices. Something Clicks isn&rsquo;t part of what you agree with them.
        </li>
      </ul>

      <h2>6. How we use information</h2>
      <ul>
        <li>To run your account, confirm business claims, and email you sign-in links and notices.</li>
        <li>
          To show you businesses that fit yours, and to show your business (name, category, city and distance) to the
          verified owners of businesses it fits.
        </li>
        <li>
          To make introductions. <strong>Your contact details are shared with another business only after you both
          accept the introduction.</strong>
        </li>
        <li>To process payments, manage memberships and campaigns, and credit referrals.</li>
        <li>To show public vendor profiles, deliver each inquiry to the vendor it&rsquo;s meant for, and send the couple a confirmation.</li>
        <li>To show vendors counts of their profile views and inquiries, and where they came from.</li>
        <li>To answer your messages and requests.</li>
        <li>To send occasional updates, only if you opted in. Every update has an unsubscribe link.</li>
        <li>To understand, in aggregate, how the site is used, and to keep it secure.</li>
      </ul>
      <p>We don&rsquo;t sell personal information, and we don&rsquo;t share it for targeted advertising.</p>

      <h2>7. Service providers</h2>
      <p>These companies process information for us, under their own privacy terms:</p>
      <ul>
        <li><strong>Vercel</strong>: hosts the site and provides cookieless analytics.</li>
        <li><strong>Supabase</strong>: our database, and storage for portfolio photos.</li>
        <li><strong>Resend</strong>: sends our email, including inquiries to vendors and confirmations to couples.</li>
        <li><strong>Stripe</strong>: processes payments and runs the billing portal. We never store card numbers.</li>
        <li><strong>PromoteKit</strong>: tracks referral links and sets the referral cookie.</li>
        {ga && <li><strong>Google</strong>: Google Analytics.</li>}
        <li>
          <strong>Anthropic</strong>: when we turn it on, AI that helps us review business categories (for example, to
          draft a new category from a search phrase). It receives category names and search phrases, not your account
          details.
        </li>
        <li><strong>Cloudflare</strong>: domain name (DNS) services.</li>
      </ul>
      <p>
        We may also disclose information if the law requires it, to protect our rights, users or the public, or as part
        of a sale or reorganization of our business.
      </p>

      <h2>8. How long we keep it</h2>
      <ul>
        <li>Account, business, introduction and partnership information: while your account is active.</li>
        <li>
          When you ask us to delete your account, we delete or anonymize your information within 30 days, except what we
          must keep by law.
        </li>
        <li>Payment records: as long as tax and accounting law requires, generally seven years.</li>
        <li>Agreement acceptance records: for as long as the agreement applies and for seven years after.</li>
        <li>Form submissions: up to two years after our last contact with you, unless you ask us to delete them sooner.</li>
        <li>Inquiries: up to two years after they&rsquo;re sent, unless you ask us to delete them sooner. A vendor may keep the copy we emailed them.</li>
        <li>Public profile details and portfolio photos: until the vendor removes them or closes their account.</li>
        <li>Hashed IP records and used or expired sign-in links: about a day.</li>
        <li>
          Removed listings: we keep the listing ID, website domain and phone on a do-not-list record so the business
          stays removed.
        </li>
        <li>Anonymous counts may be kept longer.</li>
      </ul>

      <h2>9. Your rights and choices</h2>
      <ul>
        <li>
          <strong>Access, correction and deletion.</strong> Ask to see, correct or delete your information through our{" "}
          <Contact />. You can also edit your profile from your dashboard.
        </li>
        <li><strong>Unsubscribe.</strong> Use the link in any update email.</li>
        <li><strong>Leave the network.</strong> Turn it off in your profile at any time.</li>
        <li>
          <strong>Your public profile.</strong> Vendors can hide it, edit it or remove photos from the dashboard at any time.
        </li>
        <li>
          <strong>Inquiries.</strong> Couples can ask us to delete an inquiry through our <Contact />. We can&rsquo;t delete
          the copy already sent to the vendor; ask them directly.
        </li>
        <li>
          <strong>Remove a listing.</strong> Use <Link href="/remove-my-business">Remove my business</Link>.
        </li>
        {ga && <li><strong>Analytics.</strong> Use Google&rsquo;s opt-out add-on or block cookies in your browser.</li>}
      </ul>
      <p>
        We answer requests within 30 days and may need to confirm it&rsquo;s you first. If the law where you live gives
        you more rights, we honor them.
      </p>

      <h2>10. Security</h2>
      <p>
        Information travels over encrypted connections (HTTPS), and our database is reachable only by our servers and
        our administrator. Sign-in links are single use and stored only as hashes. No system is perfectly secure, so we
        can&rsquo;t guarantee security, but we&rsquo;ll tell you promptly if a breach affects your information.
      </p>

      <h2>11. Children</h2>
      <p>The site is for business owners and professionals and isn&rsquo;t directed to anyone under 16.</p>

      <h2>12. Changes</h2>
      <p>
        If we change this policy, we&rsquo;ll post the new version here with a new date. For significant changes,
        we&rsquo;ll also email account holders before they take effect.
      </p>

      <h2>13. Contact</h2>
      <p>
        {site.legalName}. Questions or requests: our <Contact />.
      </p>
    </LegalPage>
  );
}
