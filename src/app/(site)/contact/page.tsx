import { MapPin, Clock } from "lucide-react";
import { ContactForm } from "@/components/forms/ContactForm";
import { P } from "@/components/Placeholder";
import { PageHero, Section } from "@/components/ui";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Contact",
  path: "/contact",
  description: "Contact Something Clicks about the Network, the founding pilot, or referral partnerships.",
});

export default function ContactPage() {
  return (
    <>
      <PageHero
        title="Let's talk."
        intro="Questions about the founding pilot, referral partnerships, or anything else? Send a note and a real person will reply."
      />
      <Section>
        <div className="grid gap-12 md:grid-cols-[1fr_1.6fr]">
          <ul className="space-y-6">
            <li className="flex gap-3">
              <MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-royal" />
              <div>
                <p className="font-semibold">Service area</p>
                <p className="text-navy-soft">{site.region}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <Clock aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-royal" />
              <div>
                <p className="font-semibold">Response time</p>
                <p className="text-navy-soft">
                  We reply <P value={site.responseWindow} />.
                </p>
              </div>
            </li>
          </ul>
          <div>
            <h2 className="text-2xl">Send a message</h2>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
