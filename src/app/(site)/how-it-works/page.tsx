import { FileText, Link2, ShieldCheck } from "lucide-react";
import { CtaBand } from "@/components/CtaBand";
import { ButtonLink, Card, PageHero, Section, SectionHeading } from "@/components/ui";
import { briefContents, stages, trackingMethods } from "@/content/process";
import { consentCopy } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "How It Works",
  path: "/how-it-works",
  description:
    "Map, qualify, match, package, distribute, measure, learn: how Something Clicks coordinates tracked partnerships between complementary local businesses.",
});

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        title="From overlapping customers to a tracked joint offer."
        intro="Seven stages, coordinated by Something Clicks. You stay in control of your name, your offer, and your customers at every step."
      >
        <ButtonLink href="/join" variant="onDark">
          Apply to the founding pilot
        </ButtonLink>
      </PageHero>

      <Section aria-labelledby="stages-heading">
        <SectionHeading id="stages-heading" title="Seven stages" />
        <ol className="mt-10 space-y-4">
          {stages.map((s, i) => (
            <li key={s.key} id={s.key} className="scroll-mt-24">
              <Card className="grid gap-6 md:grid-cols-[220px_1fr_1fr]">
                <div>
                  <span className="text-sm font-semibold text-royal">Stage {i + 1}</span>
                  <h3 className="mt-1 text-2xl">{s.title}</h3>
                  <p className="mt-1 text-navy-soft">{s.summary}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-navy-soft">What we do</h4>
                  <p className="mt-2">{s.weDo}</p>
                </div>
                <div className="rounded-xl bg-ice p-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-navy-soft">What you do</h4>
                  <p className="mt-2">{s.youDo}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="cloud" aria-labelledby="brief-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <FileText aria-hidden="true" className="h-8 w-8 text-royal" />
            <SectionHeading
              id="brief-heading"
              title="One page that keeps both partners on the same plan."
              intro="Every match gets a written brief. Both partners approve it before anything is shared."
            />
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {briefContents.map((b) => (
              <li key={b.title} className="rounded-xl bg-white p-5 ring-1 ring-line">
                <h3 className="text-base">{b.title}</h3>
                <p className="mt-1 text-sm text-navy-soft">{b.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section aria-labelledby="tracking-heading">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Link2 aria-hidden="true" className="h-8 w-8 text-royal" />
            <SectionHeading
              id="tracking-heading"
              title="Simple counts both partners can trust."
              intro="At the end of the cycle you receive a short results summary: what was shared, what was redeemed, and what we'd change."
            />
          </div>
          <div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {trackingMethods.map((t) => (
                <li key={t.title} className="rounded-xl bg-cloud p-5">
                  <h3 className="text-base">{t.title}</h3>
                  <p className="mt-1 text-sm text-navy-soft">{t.body}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex gap-3 rounded-xl bg-ice p-5">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-royal" />
              <p className="text-sm">
                <strong>What we don&rsquo;t collect:</strong> customer lists or customers&rsquo; personal details.
                Partners never exchange customer data. Results are counts, not contact records. {consentCopy.disclosed}
              </p>
            </div>
          </div>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
