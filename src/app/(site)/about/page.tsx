import { Eye, MapPin, Scale } from "lucide-react";
import { CtaBand } from "@/components/CtaBand";
import { P } from "@/components/Placeholder";
import { ButtonLink, Card, PageHero, Section, SectionHeading } from "@/components/ui";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "About",
  path: "/about",
  description:
    "Why Something Clicks exists: to make it easier for independent Salt Lake Valley businesses to grow through the customers and trust already in their local business community.",
});

const principles = [
  {
    icon: Eye,
    title: "Disclosed, always",
    body: "Partners tell their customers when they're sharing a partner's offer. No hidden endorsements.",
  },
  {
    icon: Scale,
    title: "Honest measurement",
    body: "We report what the tracking shows, including when a partnership didn't produce much. That's how the model improves.",
  },
  {
    icon: MapPin,
    title: "Local and independent",
    body: "We work with independently owned businesses in the Salt Lake Valley, and the customer relationships stay with them.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About Something Clicks" title="Our mission" intro={<p className="text-xl text-white">{site.mission}</p>} />

      <Section aria-labelledby="why-heading">
        <div className="grid gap-10 md:grid-cols-2">
          <SectionHeading id="why-heading" eyebrow="Why we exist" title="The best local referrals shouldn't depend on luck." />
          <div className="space-y-4 text-lg text-navy-soft">
            <p>
              Independent businesses already share customers. The mover hands off to the furniture installer, the
              property manager knows which cleaner tenants like, the photographer knows the florist. These connections
              are some of the most trusted recommendations a customer ever gets.
            </p>
            <p>
              But they mostly happen informally, nobody measures them, and they&rsquo;re hard to start on purpose.
              Something Clicks is a managed partnership network: we find businesses whose customers overlap, match them,
              help them build a joint offer, coordinate how each partner shares it, and track what it leads to.
            </p>
            <p>
              We&rsquo;re not a marketing agency, an ad seller, or an influencer marketplace. We&rsquo;re in a founding
              pilot, testing whether this model works for local businesses, and we&rsquo;ll be open about what we learn.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="cloud" aria-labelledby="principles-heading">
        <SectionHeading id="principles-heading" eyebrow="How we work" title="Principles" />
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {principles.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Card className="h-full">
                <Icon aria-hidden="true" className="h-7 w-7 text-royal" />
                <h3 className="mt-4 text-xl">{title}</h3>
                <p className="mt-2 text-navy-soft">{body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section aria-labelledby="founder-heading">
        <div className="grid gap-10 md:grid-cols-[280px_1fr]">
          <div>
            <div
              data-placeholder="founder-photo"
              className="grid aspect-square w-full max-w-[280px] place-items-center rounded-2xl border-2 border-dashed border-navy-soft bg-cloud text-center text-sm font-semibold text-navy-soft"
            >
              Founder photo
              <br />
              (placeholder)
            </div>
          </div>
          <div>
            <p className="eyebrow">A note from the founder</p>
            <h2 id="founder-heading" className="mt-2 text-3xl">
              {site.founder.name}
            </h2>
            <p className="text-navy-soft">
              {site.founder.role}, {site.legalName}
            </p>
            <div className="mt-6 text-lg">
              <P value={site.founderNote} />
            </div>
            <ButtonLink href="/contact" variant="secondary" className="mt-8">
              Get in touch
            </ButtonLink>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
