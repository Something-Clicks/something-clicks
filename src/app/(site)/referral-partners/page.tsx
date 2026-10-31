import { ReferralForm } from "@/components/forms/ReferralForm";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Referral partners",
  path: "/referral-partners",
  description:
    "Venue coordinators, planners and other well-connected wedding pros: help the vendors you trust find each other.",
});

const who = ["Venue coordinators", "Wedding planners", "Day-of coordinators", "Bridal shop owners", "Officiants", "Wedding association leaders"];

const steps = [
  { title: "Tell us who you know.", body: "The kinds of vendors you work with, and how." },
  { title: "Make an introduction.", body: "With their permission, point them our way." },
  { title: "We take it from there.", body: "They claim their business and see who fits." },
];

export default function ReferralPartnersPage() {
  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-20 sm:py-28">
          <h1 className="max-w-3xl text-5xl leading-[1.05] sm:text-6xl">You already know who should know each other.</h1>
          <p className="mt-6 max-w-xl text-xl text-mist">Help the wedding vendors you trust find each other.</p>
          <a href="#interest-form" className="mt-10 inline-flex rounded-xl bg-white px-6 py-4 text-lg font-semibold text-navy hover:bg-ice">
            Share your interest
          </a>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28" aria-labelledby="who-heading">
        <div className="container-page grid gap-10 md:grid-cols-2">
          <h2 id="who-heading" className="text-4xl sm:text-5xl">Made for connectors.</h2>
          <ul className="grid grid-cols-2 gap-3 self-center">
            {who.map((t) => <li key={t} className="rounded-xl bg-cloud px-4 py-3 font-medium">{t}</li>)}
          </ul>
        </div>
      </section>

      <section className="bg-cloud py-20 sm:py-28" aria-labelledby="steps-heading">
        <div className="container-page">
          <h2 id="steps-heading" className="text-4xl sm:text-5xl">Light touch.</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-navy font-semibold text-white">{i + 1}</span>
                <h3 className="mt-5 text-xl">{s.title}</h3>
                <p className="mt-2 text-lg text-navy-soft">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-12 max-w-3xl text-sm text-navy-soft">
            <strong className="text-navy">About rewards:</strong> a thank-you for introductions is possible only where the law and any
            professional rules that apply to you allow it, and only under an individual written agreement. Nothing here
            promises a commission or payment.
          </p>
        </div>
      </section>

      <section id="interest-form" className="scroll-mt-16 bg-white py-20 sm:py-28" aria-labelledby="form-heading">
        <div className="container-page max-w-2xl">
          <h2 id="form-heading" className="text-4xl">Tell us about your network.</h2>
          <p className="mt-3 text-lg text-navy-soft">About three minutes. We&rsquo;ll follow up.</p>
          <div className="mt-8"><ReferralForm /></div>
        </div>
      </section>
    </>
  );
}
