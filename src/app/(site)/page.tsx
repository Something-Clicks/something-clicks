import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/network/CategoryIcon";
import { FindForm } from "@/components/network/FindForm";
import { activeJourneys, categoryById } from "@/content/journeys";
import { metros } from "@/content/metros";
import { formatAtLeast } from "@/content/network";
import { site } from "@/content/site";
import { dbConfigured } from "@/lib/db";
import { pageMeta } from "@/lib/metadata";
import { metroTotals } from "@/lib/network/metros";
import { mappedCount, resolveLocation, searchMatches } from "@/lib/network/search";

export const metadata = pageMeta({
  title: "Home",
  path: "/",
  description:
    "Good businesses know other good businesses. See which local businesses fit yours, request an introduction, and grow together. Free to claim your business and see your matches.",
});

// Live numbers on this page come from the database; refresh hourly.
export const revalidate = 3600;

const EXAMPLE = { what: "Photographer", where: "Dallas, TX" };

const steps = [
  { title: "Claim your business", body: "Free. Takes a minute." },
  { title: "See your matches", body: "And why each one fits." },
  { title: "Get introduced", body: "One tap. Both sides agree." },
  { title: "Grow together", body: "Referrals, shared offers, promotions." },
];

export default async function HomePage() {
  const [example, mapped, totals] = dbConfigured()
    ? await Promise.all([
        exampleResults(),
        mappedCount("weddings").catch(() => 0),
        metroTotals().catch(() => ({}) as Record<string, number>),
      ])
    : [null, 0, {} as Record<string, number>];
  const journey = activeJourneys()[0];
  const exampleHref = `/matches?${new URLSearchParams(EXAMPLE)}`;

  return (
    <>
      <section className="bg-white">
        <div className="container-page flex flex-col items-center pb-12 pt-12 text-center sm:pb-16 sm:pt-20">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] sm:text-6xl">Who fits your business?</h1>
          <p className="mt-4 text-lg text-navy-soft sm:text-xl">
            {mapped > 0 ? `${formatAtLeast(mapped)} ${journey?.noun ?? "businesses"}, mapped.` : site.tagline}
          </p>
          <div className="mt-8 w-full max-w-4xl">
            <FindForm chips />
          </div>
        </div>
      </section>

      {example && example.results.length > 0 && (
        <section className="bg-cloud pt-12 sm:pt-16" aria-labelledby="fits-heading">
          <div className="container-page">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="fits-heading" className="text-2xl sm:text-3xl">Fits a photographer near Dallas</h2>
              <Link href={exampleHref} className="shrink-0 font-semibold text-royal hover:underline">
                See all
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
              {example.results.map((r) => (
                <li key={r.category.id}>
                  <Link
                    href={exampleHref}
                    className="flex h-full flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-line hover:ring-royal sm:p-5"
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ice text-royal">
                      <CategoryIcon id={r.category.id} />
                    </span>
                    <span className="text-3xl font-bold leading-none tracking-tight tabular-nums">{r.count.toLocaleString("en-US")}</span>
                    <span className="font-semibold leading-snug">{r.category.plural}</span>
                    <span className="hidden text-sm text-navy-soft sm:block">{r.reason}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section id="cities" className="bg-cloud py-12 sm:py-16" aria-labelledby="cities-heading">
        <div className="container-page">
          <h2 id="cities-heading" className="text-2xl sm:text-3xl">Matches are live in</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
            {metros.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/weddings/${m.slug}`}
                  className="flex h-full items-center justify-between gap-3 rounded-3xl bg-white p-4 ring-1 ring-line hover:ring-royal sm:flex-col sm:items-start sm:p-5"
                >
                  <span>
                    <span className="block text-sm text-navy-soft">{m.state}</span>
                    <span className="block text-lg font-semibold">{m.name}</span>
                  </span>
                  {totals[m.cluster] ? (
                    <span className="text-sm text-navy-soft">{formatAtLeast(totals[m.cluster])} businesses</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-16 bg-white py-12 sm:py-16" aria-labelledby="how-heading">
        <div className="container-page">
          <h2 id="how-heading" className="text-2xl sm:text-3xl">How it works</h2>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-start gap-4 rounded-3xl bg-cloud p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-royal text-sm font-semibold text-white">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{s.title}</span>
                  <span className="block text-sm text-navy-soft">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link
            href="/claim"
            className="mt-8 hidden items-center gap-2 rounded-full bg-navy px-6 py-3.5 font-semibold text-white hover:bg-[#0e1b2c] sm:inline-flex"
          >
            Claim your business, free <ArrowRight aria-hidden="true" className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Mobile: the next action stays within thumb reach. */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur sm:hidden">
        <Link href="/claim" className="flex h-12 items-center justify-center rounded-2xl bg-royal font-semibold text-white">
          Claim your business · free
        </Link>
      </div>

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
    const category = categoryById("photographers");
    if (location.status !== "found" || !category) return null;
    return { results: await searchMatches(category.id, location.place, 6) };
  } catch {
    return null;
  }
}
