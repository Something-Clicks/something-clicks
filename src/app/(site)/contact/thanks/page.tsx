import type { Metadata } from "next";
import { P } from "@/components/Placeholder";
import { ThanksPage } from "@/components/ThanksPage";
import { TrackSubmit } from "@/components/TrackSubmit";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Message sent", robots: { index: false } };

export default function ContactThanksPage() {
  return (
    <ThanksPage title="Message sent.">
      <p>
        Thanks for reaching out. We read every message and reply <P value={site.responseWindow} />.
      </p>
      <TrackSubmit form="contact" />
    </ThanksPage>
  );
}
