import { Eye, Handshake, Store } from "lucide-react";
import { CtaBand } from "@/components/CtaBand";
import { P } from "@/components/Placeholder";
import { ButtonLink } from "@/components/ui";
import { pricing, steps, summary } from "@/content/explainer";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "About",
  path: "/about",
  description: summary,
});

const principles = [
  { icon: Handshake, title: "Both sides agree.", body: "No introduction, no shared details, no partnership without a yes from both businesses." },
  { icon: Eye, title: "Always disclosed.", body: "When you share a partner's offer, your customers know it's a partner." },
  { icon: Store, title: "Yours to keep.", body: "Your customers and your relationships stay with you. We never ask for customer lists." },
];

export default function AboutPage() {
  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-20 sm:py-28">
          <h1 className="max-w-3xl text-5xl leading-[1.05] sm:text-6xl">The best referrals come from people you trust.</h1>
          <p className="mt-6 max-w-xl text-xl text-mist">{summary}</p>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28" aria-labelledby="how-heading">
        <div className="container-page">
          <h2 id="how-heading" className="text-4xl sm:text-5xl">How it works.</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-cloud p-6">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-sm font-bold text-white" aria-hidden="true">{i + 1}</span>
                <h3 className="mt-4 text-xl">{s.title}</h3>
                <p className="mt-2 text-navy-soft">{s.body}</p>
              </li>
            ))}
          </ol>
          <h2 className="mt-16 text-3xl">Pricing</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {pricing.map((p) => (
              <li key={p.name} className="rounded-2xl p-6 ring-1 ring-line">
                <p className="font-semibold">{p.name} <span className="text-navy-soft">· {p.price}</span></p>
                <p className="mt-2 text-navy-soft">{p.body}</p>
              </li>
            ))}
          </ul>
          <a href="/pricing" className="mt-6 inline-block font-semibold text-navy underline underline-offset-2">See pricing</a>
        </div>
      </section>

      <section className="bg-cloud py-20 sm:py-28" aria-labelledby="principles-heading">
        <div className="container-page">
          <h2 id="principles-heading" className="text-4xl sm:text-5xl">What we stand for.</h2>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-2xl bg-white p-7 ring-1 ring-line">
                <Icon aria-hidden="true" className="h-8 w-8 text-royal" />
                <h3 className="mt-5 text-2xl">{title}</h3>
                <p className="mt-2 text-lg text-navy-soft">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28" aria-labelledby="founder-heading">
        <div className="container-page grid gap-10 md:grid-cols-[280px_1fr]">
          <div
            data-placeholder="founder-photo"
            className="grid aspect-square w-full max-w-[280px] place-items-center rounded-2xl border-2 border-dashed border-navy-soft bg-cloud text-center text-sm font-semibold text-navy-soft"
          >
            Founder photo
            <br />
            (placeholder)
          </div>
          <div>
            <h2 id="founder-heading" className="text-4xl">{site.founder.name}</h2>
            <p className="mt-1 text-navy-soft">Founder, {site.name}</p>
            <div className="mt-6 text-lg"><P value={site.founderNote} /></div>
            <ButtonLink href="/contact" variant="secondary" className="mt-8">Get in touch</ButtonLink>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
