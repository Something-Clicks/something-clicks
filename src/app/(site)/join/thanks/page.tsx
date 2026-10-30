import type { Metadata } from "next";
import { P } from "@/components/Placeholder";
import { ThanksPage } from "@/components/ThanksPage";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Application received", robots: { index: false } };

export default function JoinThanksPage() {
  return (
    <ThanksPage title="Thank you. Your application is in.">
      <p>
        This is an application, not a confirmation of membership. Acceptance into the founding pilot isn&rsquo;t
        guaranteed: the first cycle is intentionally small, and we review every application for fit and capacity.
      </p>
      <p>
        A member of the Something Clicks team will review your answers and follow up <P value={site.responseWindow} />,
        whatever the outcome. If your business is a better fit for a future cycle, we&rsquo;ll keep your application on
        file and let you know.
      </p>
      <p>
        Questions in the meantime? Email <P value={site.contactEmail} />.
      </p>
    </ThanksPage>
  );
}
