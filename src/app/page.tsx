import Link from "next/link";

const steps = [
  {
    title: "Someone you trust refers you",
    body: "Your commercial realtor, leasing agent, property manager, mover, or maintenance company knows you need cleaning and sends you to us.",
  },
  {
    title: "You confirm your details",
    body: "Tell us about your space and how often you need cleaning. You choose to share your request — nothing is shared until you agree.",
  },
  {
    title: "One cleaning company, not ten",
    body: "We match your request to one vetted Salt Lake Valley cleaning company that serves your area and fits your space. No bidding wars, no spam calls.",
  },
  {
    title: "They walk through and quote",
    body: "The cleaning company visits, sees the space, and gives you a real quote. You decide whether to hire them.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-brand-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Salt Lake Valley, Utah</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Commercial cleaning walkthroughs, through people you already trust.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-zinc-700">
            Something Clicks connects businesses that need commercial cleaning with one vetted local cleaning
            company — through referrals from the realtors, property managers, and service pros you already work
            with.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/book" className="btn !px-5 !py-3 !text-base">
              Request a walkthrough
            </Link>
            <Link href="/partners" className="btn-secondary !px-5 !py-3 !text-base">
              Become a referral partner
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold tracking-tight">How it works for businesses</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="card">
              <span className="text-sm font-semibold text-brand-700">Step {i + 1}</span>
              <h3 className="mt-2 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-zinc-600">Free for businesses. You are never obligated to hire anyone.</p>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-bold">Refer businesses, earn a referral fee</h2>
            <p className="mt-3 text-zinc-600">
              Commercial realtors, leasing agents, property managers, commercial movers, office furniture installers,
              and property maintenance companies hear about cleaning needs first. Send those businesses our way and
              earn a fee for every completed walkthrough.
            </p>
            <Link href="/partners" className="btn mt-5">
              Learn about the partner program
            </Link>
          </div>
          <div className="card">
            <h2 className="text-xl font-bold">For commercial cleaning companies</h2>
            <p className="mt-3 text-zinc-600">
              Get exclusive, pre-qualified walkthrough appointments with businesses in your service area. Prepay for a
              pack of appointments and only use a credit when a walkthrough actually happens.
            </p>
            <Link href="/cleaning-companies" className="btn mt-5">
              How it works for cleaning companies
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
