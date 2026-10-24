import Link from "next/link";

const businessSteps = [
  { title: "Tell us what you need", body: "Describe your space and how often you need cleaning." },
  { title: "We look for one company that fits", body: "Your details go to one local cleaning company, and only after you agree." },
  { title: "They visit and give you a quote", body: "You decide whether to hire them." },
];

export default function HomePage() {
  return (
    <>
      <section className="bg-brand-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
            Commercial cleaning walkthroughs for Salt Lake Valley businesses.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-700">
            Something Clicks connects businesses that need commercial cleaning with local cleaning companies, starting with a
            walkthrough.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="card flex flex-col">
              <h2 className="text-xl font-bold">Need commercial cleaning?</h2>
              <p className="mt-2 flex-1 text-zinc-600">
                Send a request for a free walkthrough of your space. There&apos;s no obligation to hire anyone.
              </p>
              <Link href="/book" className="btn btn-lg mt-5 self-start">
                Request a walkthrough
              </Link>
            </div>
            <div className="card flex flex-col">
              <h2 className="text-xl font-bold">Run a cleaning company?</h2>
              <p className="mt-2 flex-1 text-zinc-600">
                We connect cleaning companies with businesses that have asked for a commercial cleaning walkthrough.
              </p>
              <Link href="/cleaning-companies" className="btn-secondary btn-lg mt-5 self-start">
                See the pilot
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="businesses" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-14">
        <h2 className="text-2xl font-bold tracking-tight">How it works for businesses</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {businessSteps.map((step, i) => (
            <li key={step.title}>
              <span className="text-sm font-semibold text-brand-700">Step {i + 1}</span>
              <h3 className="mt-1 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-zinc-200 bg-zinc-50">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-zinc-600">
          Interested in referring businesses?{" "}
          <Link href="/partners" className="font-medium text-brand-700 underline underline-offset-4">
            Apply to be a partner
          </Link>
          . The program isn&apos;t open for referrals yet.
        </p>
      </section>
    </>
  );
}
