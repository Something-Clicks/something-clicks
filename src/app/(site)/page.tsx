import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { CategoryMatchCard } from "@/components/network/CategoryMatchCard";
import { CategoryIcon } from "@/components/network/CategoryIcon";
import { FindForm } from "@/components/network/FindForm";
import { activeJourneys, categoryById } from "@/content/journeys";
import { metros } from "@/content/metros";
import { formatAtLeast } from "@/content/network";
import { site } from "@/content/site";
import { dbConfigured } from "@/lib/db";
import { pageMeta } from "@/lib/metadata";
import { mappedCount, resolveLocation, searchMatches, SEARCH_RADIUS_MILES } from "@/lib/network/search";

export const metadata = pageMeta({
  title: "Home",
  path: "/",
  description:
    "Good businesses know other good businesses. See which local businesses fit yours, request an introduction, and grow together. Free to claim your business and see your matches.",
});

// Live numbers on this page come from the database; refresh hourly.
export const revalidate = 3600;

const EXAMPLE = { what: "photographers", where: "Dallas, TX" };

const steps = [
  { title: "Tell us about your business.", body: "Find it, claim it, confirm a few details." },
  { title: "See your matches.", body: "Local businesses that fit yours, and why." },
  { title: "Make a connection.", body: "One click to request an introduction." },
  { title: "Grow together.", body: "Set up referrals, a shared offer, or a promotion." },
];

const progress = ["Matched", "Introduced", "Connected", "Partnership live"];

export default async function HomePage() {
  const [example, mapped] = dbConfigured()
    ? await Promise.all([exampleResults(), mappedCount("weddings").catch(() => 0)])
    : [null, 0];
  const journey = activeJourneys()[0];

  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-20 sm:py-28">
          <h1 className="max-w-3xl text-5xl leading-[1.05] sm:text-7xl">Good businesses know other good businesses.</h1>
          <p className="mt-6 max-w-xl text-xl text-mist">See which local businesses fit yours, and why.</p>
          <div className="mt-10 max-w-4xl">
            <FindForm />
          </div>
          <p className="mt-4 text-sm text-mist">Free to claim your business and see your matches.</p>
        </div>
      </section>

      {example && example.results.length > 0 && (
        <section className="bg-cloud py-20 sm:py-28" aria-labelledby="fits-heading">
          <div className="container-page">
            <h2 id="fits-heading" className="text-4xl sm:text-5xl">See who fits.</h2>
            <p className="mt-3 text-lg text-navy-soft">
              A real search: {example.category} in {example.place}.
            </p>
            <ul className="mt-10 grid gap-6 md:grid-cols-3">
              {example.results.map((r) => (
                <li key={r.category.id}>
                  <CategoryMatchCard r={r} radiusMiles={SEARCH_RADIUS_MILES} claimHref={`/matches?${new URLSearchParams(EXAMPLE)}`} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section id="how-it-works" className="scroll-mt-16 bg-white py-20 sm:py-28" aria-labelledby="how-heading">
        <div className="container-page">
          <h2 id="how-heading" className="text-4xl sm:text-5xl">Make the connection.</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-royal font-semibold text-white">{i + 1}</span>
                <h3 className="mt-5 text-xl">{s.title}</h3>
                <p className="mt-2 text-navy-soft">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 rounded-2xl bg-cloud p-6 sm:p-8">
            <p className="text-sm font-semibold text-navy-soft">Every partnership shows its progress</p>
            <ol className="mt-4 grid gap-3 sm:grid-cols-4" aria-label="Partnership progress">
              {progress.map((p, i) => (
                <li key={p} className="flex items-center gap-3">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${i < 3 ? "bg-royal text-white" : "bg-white text-navy ring-2 ring-royal"}`}>
                    {i < 3 ? <Check aria-hidden="true" className="h-4 w-4" /> : <span aria-hidden="true" className="h-2 w-2 rounded-full bg-cyan" />}
                  </span>
                  <span className="font-medium">{p}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-ice py-20 sm:py-28" aria-labelledby="together-heading">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 id="together-heading" className="text-4xl sm:text-5xl">Better together.</h2>
            <p className="mt-4 text-xl text-navy-soft">
              Your next customer is already working with a business you should know.
            </p>
            {mapped > 0 && (
              <p className="mt-8 text-lg">
                <span className="block text-5xl font-semibold tracking-tight text-royal tabular-nums">{formatAtLeast(mapped)}</span>
                {journey?.noun ?? "businesses"} mapped across the U.S.
              </p>
            )}
            <p className="mt-8 text-navy-soft">
              Matches are live in{" "}
              {metros.map((m, i) => (
                <span key={m.slug}>
                  <Link href={`/weddings/${m.slug}`} className="font-semibold text-royal hover:underline">{m.name}</Link>
                  {i < metros.length - 2 ? ", " : i === metros.length - 2 ? " and " : "."}
                </span>
              ))}
            </p>
          </div>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4" aria-label={`${journey?.name ?? ""} categories`}>
            {journey?.categories.filter((c) => !c.broad).slice(0, 12).map((c) => (
              <li key={c.id} className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center text-sm ring-1 ring-line">
                <CategoryIcon id={c.id} className="h-6 w-6 text-royal" />
                <span>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-navy text-white on-dark">
        <div className="container-page py-20 text-center sm:py-28">
          <h2 className="text-4xl sm:text-6xl">Make the complicated click.</h2>
          <Link href="/#find" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-4 text-lg font-semibold text-navy hover:bg-ice">
            Find my matches <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </Link>
          <p className="mt-4 text-sm text-mist">Free to claim your business and see your matches.</p>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: site.legalName,
            alternateName: site.name,
            url: site.url,
          }).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}

async function exampleResults() {
  try {
    const location = await resolveLocation(EXAMPLE.where);
    const category = categoryById(EXAMPLE.what);
    if (location.status !== "found" || !category) return null;
    return {
      category: category.plural,
      place: location.place.label,
      results: await searchMatches(category.id, location.place, 3),
    };
  } catch {
    return null;
  }
}
