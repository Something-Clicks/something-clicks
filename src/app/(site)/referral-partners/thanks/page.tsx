import type { Metadata } from "next";
import { P } from "@/components/Placeholder";
import { ThanksPage } from "@/components/ThanksPage";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Thanks for your interest", robots: { index: false } };

export default function ReferralThanksPage() {
  return (
    <ThanksPage title="Thanks. We'll be in touch.">
      <p>
        We&rsquo;ve received your interest in introducing businesses to the Something Clicks Network. We&rsquo;ll follow
        up <P value={site.responseWindow} /> to talk through which introductions might be a good fit.
      </p>
      <p>
        Any thank-you for introductions is possible only where permitted and would be set out in an individual written
        agreement. Nothing is promised by submitting this form.
      </p>
    </ThanksPage>
  );
}
