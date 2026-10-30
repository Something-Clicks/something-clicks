import { Building2, MessageCircle, Scale, Sparkles } from "lucide-react";
import { ReferralForm } from "@/components/forms/ReferralForm";
import { Card, PageHero, Section, SectionHeading } from "@/components/ui";
import { pilot } from "@/content/pilot";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "For Referral Partners",
  path: "/referral-partners",
  description:
    "Property managers, commercial real estate professionals, and other well-connected Salt Lake Valley professionals can introduce businesses to the Something Clicks Network.",
});

const steps = [
  { icon: MessageCircle, title: "Tell us who you know", body: "Share the kinds of businesses you work with and how you know them." },
  { icon: Building2, title: "Make an introduction", body: "When a business looks like a fit, introduce us, with their permission." },
  { icon: Sparkles, title: "We take it from there", body: "We handle the application, matching, and coordination. You stay in the loop." },
];

export default function ReferralPartnersPage() {
  return (
    <>
      <PageHero
        eyebrow="For referral partners"
        title="You already know which businesses should know each other."
        intro="Property managers, commercial real estate professionals, consultants, and other well-connected people see local businesses at the moments that matter. Help them find partners, and help your clients and tenants get better service."
      >
        <a
          href="#interest-form"
          className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 font-semibold text-navy hover:bg-ice"
        >
          Share your interest
        </a>
      </PageHero>

      <Section aria-labelledby="who-heading">
        <div className="grid gap-10 md:grid-cols-2">
          <SectionHeading
            id="who-heading"
            eyebrow={`Founding pilot: ${pilot.shortName}`}
            title="Who we're looking for first"
            intro="For the first cycle, we're especially interested in professionals who see businesses moving into, setting up, or maintaining commercial space."
          />
          <ul className="grid gap-3 self-center sm:grid-cols-2">
            {pilot.referralPartnerTypes.map((t) => (
              <li key={t} className="rounded-xl bg-cloud px-4 py-3 font-medium">
                {t}
              </li>
            ))}
            <li className="rounded-xl bg-cloud px-4 py-3 font-medium">Business consultants and advisors</li>
          </ul>
        </div>
      </Section>

      <Section tone="cloud" aria-labelledby="steps-heading">
        <SectionHeading id="steps-heading" eyebrow="How it works" title="Light-touch, on your terms" />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <Card className="h-full">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-royal text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <Icon aria-hidden="true" className="h-6 w-6 text-royal" />
                </div>
                <h3 className="mt-4 text-xl">{title}</h3>
                <p className="mt-2 text-navy-soft">{body}</p>
              </Card>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex gap-3 rounded-2xl bg-white p-6 ring-1 ring-line">
          <Scale aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-royal" />
          <div>
            <h3 className="text-lg">About rewards</h3>
            <p className="mt-1 text-navy-soft">
              In some cases we may offer a thank-you for introductions, but only where permitted by law and any
              professional rules that apply to you, and only under an individual written agreement. We don&rsquo;t
              promise any specific reward, commission, or payout, and submitting this form doesn&rsquo;t create one.
            </p>
          </div>
        </div>
      </Section>

      <Section aria-labelledby="form-heading" id="interest-form" className="scroll-mt-16">
        <div className="mx-auto max-w-2xl">
          <SectionHeading
            id="form-heading"
            eyebrow="Interest form"
            title="Tell us about your network"
            intro="Takes about three minutes. We'll follow up to talk it through."
          />
          <div className="mt-8">
            <ReferralForm />
          </div>
        </div>
      </Section>
    </>
  );
}
