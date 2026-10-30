import { BarChart3, CalendarCheck, Check, FileText, Link2, PenLine, Sparkles, Users } from "lucide-react";
import { CtaBand } from "@/components/CtaBand";
import { P } from "@/components/Placeholder";
import { ButtonLink, Card, IllustrativeTag, PageHero, Section, SectionHeading } from "@/components/ui";
import { pilot } from "@/content/pilot";
import { consentCopy } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "For Businesses",
  path: "/for-businesses",
  description:
    "What founding members of the Something Clicks Network receive, what participation asks of an owner, and illustrative partner pairings for small-business setup.",
});

const benefits = [
  {
    icon: Users,
    title: "Customers who are already in motion",
    body: "Reach people at the moment they need what you do, through a business they've just worked with.",
  },
  {
    icon: Sparkles,
    title: "A recommendation, not an ad",
    body: "Your offer arrives from a business the customer already chose, which is a very different first impression than a cold ad.",
  },
  {
    icon: BarChart3,
    title: "Visibility into what works",
    body: "Unique links and codes show what each partnership led to, so you can decide what's worth continuing.",
  },
  {
    icon: CalendarCheck,
    title: "Coordination handled",
    body: "We find the partner, draft the plan, and keep things on schedule, so the partnership doesn't stall in your inbox.",
  },
];

const receives = [
  { icon: Link2, title: "A curated match with rationale", body: "A proposed partner and a written explanation of why the fit makes sense." },
  { icon: FileText, title: "A collaboration brief", body: "The joint offer, terms, timeline, channels, and tracking, all on one page." },
  { icon: PenLine, title: "Ready-to-adapt copy", body: "Drafts for email, social, and in-person mentions for you to edit in your own voice." },
  { icon: CalendarCheck, title: "Coordination and reminders", body: "Check-ins and nudges for both partners through the cycle." },
  { icon: BarChart3, title: "A results summary", body: "What was shared, redeemed, and inquired about, plus what we'd change next time." },
];

const asks = [
  "A short application (about 10–15 minutes).",
  "A conversation to confirm fit and meet your proposed partner.",
  "Shaping and approving one joint offer with your partner.",
  "Sharing your partner's offer through channels you already use.",
  "Recording redemptions and inquiries that mention your partner.",
  "A brief check-in on what worked and what didn't.",
];

const pairings = [
  { pair: ["Commercial cleaning", "Property maintenance"], body: "A move-out clean and a punch-list repair booked together for tenants turning over a space." },
  { pair: ["IT and network setup", "Signage and print"], body: "Opening-week bundle: internet and phones live, exterior and interior signage installed." },
  { pair: ["Space planning", "Commercial painting and flooring"], body: "A planner's layout handed straight to a painter and flooring crew with a combined schedule." },
  { pair: ["Commercial mover", "Office furniture installer"], body: "Priority move-day scheduling with a discounted install the same week." },
];

const faqs = [
  {
    q: "Do I have to share my customer list?",
    a: "No. We never ask for customer lists or customers' personal data, and partners never exchange them. Each business shares the offer with its own customers.",
  },
  {
    q: "Will my customers know it's a partnership?",
    a: "Yes. Every shared offer is disclosed as a partnership between two businesses. We provide a plain disclosure line for you to use.",
  },
  {
    q: "Is acceptance guaranteed?",
    a: "No. We review every application for fit and capacity, and the first cycle is intentionally small. We'll follow up either way.",
  },
  {
    q: "What if my business isn't part of the small-business setup journey?",
    a: "Apply anyway. We keep applications on file and will reach out when a future cycle fits your customers.",
  },
  {
    q: "What does it cost?",
    a: "The founding pilot is free for a limited first cycle. If pricing is introduced later, we'll explain it clearly before you're asked to commit to anything.",
  },
  {
    q: "Are results guaranteed?",
    a: "No. The Network is in a founding pilot and the model is still being tested. We'll measure honestly and share what we learn, including what doesn't work.",
  },
];

export default function ForBusinessesPage() {
  return (
    <>
      <PageHero
        eyebrow="For businesses"
        title="Grow through the businesses your customers already trust."
        intro={`Founding members get a curated partner, a ready-to-run plan, and honest measurement. The first cycle focuses on ${pilot.shortName}.`}
      >
        <ButtonLink href="/join" variant="onDark">
          Apply to the founding pilot
        </ButtonLink>
      </PageHero>

      <Section aria-labelledby="benefits-heading">
        <SectionHeading id="benefits-heading" eyebrow="Why join" title="What a good partnership is designed to do" />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {benefits.map(({ icon: Icon, title, body }) => (
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

      <Section tone="cloud" aria-labelledby="receive-heading">
        <SectionHeading id="receive-heading" eyebrow="Founding members receive" title="Everything needed to run one tracked collaboration" />
        <ul className="mt-10 grid gap-4 md:grid-cols-5">
          {receives.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-2xl bg-white p-5 ring-1 ring-line">
              <Icon aria-hidden="true" className="h-6 w-6 text-royal" />
              <h3 className="mt-3 text-base">{title}</h3>
              <p className="mt-1 text-sm text-navy-soft">{body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section aria-labelledby="asks-heading">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <SectionHeading
              id="asks-heading"
              eyebrow="What participation asks"
              title="Kept deliberately light"
              intro="We aim to keep the first cycle to a few hours of your time, spread across several weeks. You tell us your realistic capacity in the application."
            />
          </div>
          <ul className="space-y-3 self-center">
            {asks.map((a) => (
              <li key={a} className="flex gap-3">
                <Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-royal" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="ice" aria-labelledby="pairings-heading">
        <SectionHeading
          id="pairings-heading"
          eyebrow={pilot.journey}
          title="Illustrative pairings"
          intro="Made-up examples of complementary businesses in the first journey. They are not real members or results."
        />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {pairings.map((p) => (
            <li key={p.body}>
              <Card className="h-full">
                <IllustrativeTag />
                <h3 className="mt-3 text-lg">
                  {p.pair[0]} <span aria-hidden="true">+</span>
                  <span className="sr-only">and</span> {p.pair[1]}
                </h3>
                <p className="mt-2 text-navy-soft">{p.body}</p>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-navy-soft">{consentCopy.disclosed}</p>
      </Section>

      <Section aria-labelledby="pilot-terms-heading">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <SectionHeading id="pilot-terms-heading" eyebrow="The founding pilot" title="Free for a limited first cycle" />
            <p className="mt-4 text-lg text-navy-soft">
              Founding members pay nothing for the first cycle (<P value={pilot.cycleLength} />). In return, we ask for
              one tracked collaboration within 30 days of being matched and candid feedback about what worked.
            </p>
            <p className="mt-4 text-navy-soft">
              <P value={pilot.applicationWindow} />
            </p>
          </div>
          <Card className="bg-cloud">
            <h3 className="text-lg">Who the founding pilot is for</h3>
            <ul className="mt-4 space-y-2">
              {[
                "Independent, locally owned businesses in the Salt Lake Valley",
                `Businesses whose customers are ${pilot.summary.toLowerCase().replace(/\.$/, "")}`,
                "Owners willing to run one tracked collaboration in the next 30 days",
                "Businesses that already reach customers somehow: an email list, social, in person, or word of mouth",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-royal" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section tone="cloud" aria-labelledby="faq-heading">
        <SectionHeading id="faq-heading" eyebrow="Questions" title="Frequently asked" />
        <div className="mt-8 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
          {faqs.map((f) => (
            <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {f.q}
                <span aria-hidden="true" className="text-xl text-royal transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-navy-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
