import Link from "next/link";
import { ArrowRight, CircleSlash, EyeOff, Hourglass, MessageSquareOff } from "lucide-react";
import { CtaBand } from "@/components/CtaBand";
import { P } from "@/components/Placeholder";
import { ButtonLink, Card, HeroLines, IllustrativeTag, Section, SectionHeading } from "@/components/ui";
import { pilot } from "@/content/pilot";
import { shortSteps } from "@/content/process";
import { consentCopy, site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Home",
  path: "/",
  description:
    "Something Clicks helps independent Salt Lake Valley businesses gain customers through complementary local businesses that already serve the same people. Founding pilot now open.",
});

const problems = [
  {
    icon: MessageSquareOff,
    title: "Informal",
    body: "Most local referrals happen through a chance conversation and depend on someone remembering to pass a name along.",
  },
  {
    icon: EyeOff,
    title: "Untracked",
    body: "Nobody can see which introductions turned into work, so even good partnerships quietly fade.",
  },
  {
    icon: Hourglass,
    title: "Hard to start",
    body: "Finding the right partner, agreeing on an offer, and following through takes time an owner rarely has.",
  },
];

const examples = [
  {
    pair: ["Commercial mover", "Office furniture installer"],
    title: pilot.exampleOffer.title,
    body: "A business moving offices gets priority move-day scheduling and a discounted furniture install, offered by whichever partner it hires first.",
    pilot: true,
  },
  {
    pair: ["Moving company", "Home organizer"],
    title: "Move-in package",
    body: "A family's movers share an organizer's unpacking offer; the organizer recommends the movers to clients planning their next move.",
  },
  {
    pair: ["Wedding photographer", "Florist"],
    title: "Engaged-couple welcome",
    body: "Each shares the other's booking offer with newly engaged couples, so the couple hears about a trusted vendor from one they already chose.",
  },
];

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.legalName,
  alternateName: site.name,
  url: site.url,
  description: site.description,
  areaServed: { "@type": "Place", name: site.region },
  founder: { "@type": "Person", name: site.founder.name },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Static, developer-authored JSON; no user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="relative overflow-hidden bg-navy text-white on-dark">
        <HeroLines />
        <div className="container-page relative py-20 sm:py-28">
          <h1 className="max-w-3xl text-4xl leading-tight sm:text-6xl">
            Local businesses can be each other&rsquo;s best source of customers.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-mist sm:text-xl">
            Something Clicks finds independent businesses whose customers already overlap, pairs them up, and helps them
            share a joint offer with the people they each already serve. Every introduction is tracked, so both sides can
            see what it led to.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/join" variant="onDark">
              Apply to the founding pilot <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/referral-partners" className="!bg-transparent ring-1 ring-inset ring-mist hover:!bg-white/10">
              I can refer businesses
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm text-mist">
            Founding pilot now open for <span className="font-semibold text-white">{pilot.shortName}</span> businesses.
          </p>
        </div>
      </section>

      {/* The reveal: the brand moment is seeing the connection. */}
      <Section tone="ice" aria-labelledby="reveal-heading">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 id="reveal-heading" className="text-3xl sm:text-4xl">
              The business you just moved on Friday needs desks assembled on Monday.
            </h2>
            <p className="mt-4 text-lg text-navy-soft">
              Your customers&rsquo; next need is often another local business&rsquo;s specialty. When those businesses
              recommend each other, customers hear about a provider from someone they already trust. Something Clicks
              exists to make that connection on purpose, not by chance.
            </p>
          </div>
          <MomentsDiagram />
        </div>
      </Section>

      <Section aria-labelledby="problem-heading">
        <SectionHeading
          id="problem-heading"
          title="Good partnerships already happen. They're just hard to start and impossible to see."
        />
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {problems.map(({ icon: Icon, title, body }) => (
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

      <Section tone="cloud" aria-labelledby="how-heading">
        <SectionHeading id="how-heading" title="Five steps, coordinated for you." />
        <ol className="mt-10 grid gap-4 md:grid-cols-5">
          {shortSteps.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl bg-white p-5 ring-1 ring-line">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-royal text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg">{step.title}</h3>
              <p className="mt-2 text-sm text-navy-soft">{step.body}</p>
            </li>
          ))}
        </ol>
        <Link href="/how-it-works" className="mt-8 inline-flex items-center gap-1 font-semibold text-royal hover:underline">
          See the full process <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </Section>

      <Section aria-labelledby="examples-heading">
        <SectionHeading
          id="examples-heading"
          title="Illustrative examples"
          intro="These are made-up examples to show the idea. They are not real members or results."
        />
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {examples.map((ex) => (
            <li key={ex.title}>
              <Card className="flex h-full flex-col bg-cloud">
                <div className="flex flex-wrap items-center gap-2">
                  <IllustrativeTag />
                  {ex.pilot && (
                    <span className="rounded-full bg-royal px-2.5 py-0.5 text-xs font-semibold text-white">
                      Founding pilot journey
                    </span>
                  )}
                </div>
                <p className="mt-4 text-sm font-semibold text-royal">
                  {ex.pair[0]} <span aria-hidden="true">+</span>
                  <span className="sr-only">and</span> {ex.pair[1]}
                </p>
                <h3 className="mt-1 text-xl">{ex.title}</h3>
                <p className="mt-2 text-navy-soft">{ex.body}</p>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-navy-soft">{consentCopy.disclosed}</p>
      </Section>

      <Section tone="navy" aria-labelledby="pilot-heading">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 id="pilot-heading" className="text-3xl sm:text-4xl">
              First journey: {pilot.journey.toLowerCase()}
            </h2>
            <p className="mt-4 text-lg text-mist">{pilot.summary}</p>
            <p className="mt-4 text-mist">{pilot.why}</p>
            <dl className="mt-8 space-y-4">
              <div>
                <dt className="font-semibold text-white">What we ask</dt>
                <dd className="mt-1 text-mist">{pilot.firstCycleAsk}</dd>
              </div>
              <div>
                <dt className="font-semibold text-white">What it costs</dt>
                <dd className="mt-1 text-mist">
                  Free for a limited first cycle (<P value={pilot.cycleLength} />).
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-white">Timing</dt>
                <dd className="mt-1 text-mist">
                  <P value={pilot.applicationWindow} />
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/15 sm:p-8">
            <h3 className="text-xl text-white">Who we&rsquo;re looking for</h3>
            <p className="mt-2 text-sm text-mist">
              Independent, locally owned Salt Lake Valley businesses that serve companies moving into, setting up, or
              maintaining a space, such as:
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {pilot.memberTypes.map((t) => (
                <li key={t} className="flex gap-2 text-sm text-white">
                  <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-mist">
              Not in this journey? Apply anyway. We keep every application on file for future cycles.
            </p>
            <ButtonLink href="/join" variant="onDark" className="mt-6 w-full sm:w-auto">
              Apply to the founding pilot
            </ButtonLink>
          </div>
        </div>
      </Section>

      <Section aria-labelledby="not-heading">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <SectionHeading
              id="not-heading"
              title="A partnership network, not an agency."
            />
            <p className="mt-4 text-lg text-navy-soft">
              We coordinate partnerships between businesses and measure what they produce. The relationship, and the
              customers, stay yours.
            </p>
          </div>
          <ul className="space-y-4 self-center">
            {[
              "We don't sell ads or run your social media.",
              "We don't broker influencer posts or paid endorsements.",
              "We never ask for your customer list or your customers' personal data.",
              "We don't promise results. The founding pilot exists to find out what works, and we'll tell you what doesn't.",
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <CircleSlash aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-royal" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}

/** A simple sequence of customer moments: the connection is the point. */
function MomentsDiagram() {
  return (
    <figure className="rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
      <figcaption className="text-sm font-semibold text-navy-soft">
        One customer, four moments, many local businesses
      </figcaption>
      <ol className="relative mt-6 space-y-6 border-l-2 border-dashed border-line pl-6">
        {pilot.moments.map((m, i) => (
          <li key={m.label} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[33px] top-0.5 h-4 w-4 rounded-full ring-4 ring-white ${
                i === 1 ? "bg-cyan" : "bg-royal"
              }`}
            />
            <p className="font-semibold">{m.label}</p>
            <p className="text-sm text-navy-soft">{m.detail}</p>
          </li>
        ))}
      </ol>
    </figure>
  );
}
