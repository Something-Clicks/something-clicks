import type { Metadata } from "next";
import Link from "next/link";
import { CategoryMatchCard } from "@/components/network/CategoryMatchCard";
import { FindForm } from "@/components/network/FindForm";
import { activeJourneys, closestVocabulary, matchVocabulary } from "@/content/journeys";
import { ComingSoon } from "@/components/ComingSoon";
import { allow } from "@/lib/members/limits";
import { readiness } from "@/lib/readiness";
import { resolveLocation, searchMatches, SEARCH_RADIUS_MILES } from "@/lib/network/search";
import { liveVocabulary, logUnmatched } from "@/lib/network/vocabulary";

export const metadata: Metadata = {
  title: "Your business matches",
  description: "See which local businesses fit yours, and why.",
  // Results pages are personal queries, not content to index.
  robots: { index: false, follow: true },
};

type Search = { what?: string; where?: string };

export default async function MatchesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { what = "", where = "" } = await searchParams;
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="container-page py-5 sm:py-6">
          <h1 className="sr-only">Find your business matches</h1>
          <FindForm what={what} where={where} compact />
        </div>
      </section>
      <section className="bg-cloud">
        <div className="container-page py-8 sm:py-12">
          {what.trim() && where.trim() ? <Results what={what} where={where} /> : <Hint />}
        </div>
      </section>
    </>
  );
}

function Hint() {
  return <p className="text-lg text-navy-soft">Tell us what your business does and where you serve customers.</p>;
}

async function Results({ what, where }: Search & { what: string; where: string }) {
  if (!(await readiness()).search) {
    return <ComingSoon compact title="Search opens soon." body="We're loading wedding businesses across the U.S. Check back shortly to see who fits yours." />;
  }
  if (!(await allow("search", 60, 30))) {
    return <p role="alert" className="text-lg">You&rsquo;ve searched a lot in the last minute. Please wait a moment and try again.</p>;
  }

  const vocab = await liveVocabulary();
  const categories = matchVocabulary(what, vocab, 1);
  if (!categories.length) {
    await logUnmatched(what);
    return <UnknownBusiness what={what} where={where} closest={closestVocabulary(what, vocab, 3).map((v) => v.label)} />;
  }
  const category = categories[0];

  const location = await resolveLocation(where);
  if (location.status === "not_found") {
    return (
      <div role="status">
        <h2 className="text-2xl">We couldn&rsquo;t find &ldquo;{where}&rdquo;.</h2>
        <p className="mt-2 text-lg text-navy-soft">Try a city and state, like Plano, TX, or a ZIP code.</p>
      </div>
    );
  }
  if (location.status === "choose") {
    return (
      <div role="status">
        <h2 className="text-2xl">Which one did you mean?</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {location.options.map((o) => (
            <li key={o.id}>
              <Link href={`/matches?${new URLSearchParams({ what, where: o.label })}`} className="inline-block rounded-full bg-white px-4 py-2.5 font-semibold text-navy ring-1 ring-line hover:ring-royal">
                {o.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const place = location.place;
  const results = await searchMatches(category.id, place);
  const claimHref = `/claim?${new URLSearchParams({ what: category.label, where: place.label })}`;
  if (!results.length) {
    return (
      <div role="status">
        <h2 className="text-2xl">No matches near {place.label} yet.</h2>
        <p className="mt-2 text-lg text-navy-soft">We&rsquo;re adding businesses all the time. Try a nearby city.</p>
      </div>
    );
  }
  return (
    <>
      <h2 className="max-w-3xl text-2xl sm:text-3xl">
        Fits a {category.label.toLowerCase()} near {place.label}
      </h2>
      <p className="mt-1 text-navy-soft">
        {capitalize(activeJourneys()[0]?.noun ?? "businesses")} within {SEARCH_RADIUS_MILES} miles · names appear once you claim your business
      </p>
      <ul className="mt-6 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => (
          <li key={r.category.id}>
            <CategoryMatchCard r={r} radiusMiles={SEARCH_RADIUS_MILES} claimHref={claimHref} />
          </li>
        ))}
      </ul>
      <p className="mt-6 text-lg">Get started free to see who they are and request introductions.</p>
      <div className="sticky bottom-3 z-30 mt-8 flex items-center justify-between gap-4 rounded-3xl bg-navy p-3 pl-5 text-white shadow-[0_8px_30px_rgba(21,38,61,0.25)] on-dark sm:static sm:p-4 sm:pl-6 sm:shadow-none">
        <p className="font-semibold">See who they are</p>
        <Link href={claimHref} className="shrink-0 rounded-2xl bg-white px-5 py-3 font-semibold text-navy hover:bg-ice">
          Get started free
        </Link>
      </div>
    </>
  );
}

function UnknownBusiness({ what, where, closest }: { what: string; where: string; closest: string[] }) {
  const j = activeJourneys()[0];
  const chip = "inline-block rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-navy ring-1 ring-line hover:ring-navy";
  return (
    <div role="status">
      <h2 className="text-2xl">We don&rsquo;t match &ldquo;{what}&rdquo; yet.</h2>
      <p className="mt-2 max-w-2xl text-lg text-navy-soft">
        We&rsquo;ve noted it, so we can add businesses like yours. You can still join now: add your business and we&rsquo;ll match it as soon as we can.
      </p>
      <Link
        href={`/claim/new?${new URLSearchParams({ what, where })}`}
        className="mt-5 inline-flex rounded-2xl bg-navy px-6 py-3 font-semibold text-white hover:bg-navy/90"
      >
        Add your business
      </Link>
      {closest.length > 0 && (
        <>
          <h3 className="mt-8 text-lg font-semibold">Did you mean…</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {closest.map((label) => (
              <li key={label}>
                <Link href={`/matches?${new URLSearchParams({ what: label, where })}`} className={chip}>{label}</Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="mt-8 text-lg font-semibold">What we match today</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {j?.categories.filter((c) => !c.broad).map((c) => (
          <li key={c.id}>
            <Link href={`/matches?${new URLSearchParams({ what: c.label, where })}`} className={chip}>{c.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
