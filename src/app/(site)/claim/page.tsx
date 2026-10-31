import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, Search } from "lucide-react";
import { stateLabels } from "@/content/network";
import { readiness } from "@/lib/readiness";
import { searchClaimable } from "@/lib/members/claims";
import { allow } from "@/lib/members/limits";
import { resolveLocation } from "@/lib/network/search";

export const metadata: Metadata = {
  title: "Claim your business",
  description: "Find your business, claim it, and see the local businesses that fit yours. Free to claim your business and see your matches.",
  alternates: { canonical: "/claim" },
};

type Search = { q?: string; where?: string };

export default async function ClaimSearchPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", where = "" } = await searchParams;
  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-14 sm:py-20">
          <h1 className="max-w-2xl text-4xl sm:text-5xl">Claim your business.</h1>
          <p className="mt-4 max-w-xl text-lg text-mist">Find it, confirm it&rsquo;s yours, and see who fits.</p>
          <form method="get" role="search" aria-label="Find your business" className="mt-8 max-w-4xl rounded-2xl bg-white/5 p-2 ring-1 ring-white/15">
            <div className="grid gap-2 md:grid-cols-[1.3fr_1fr_auto]">
              <div className="rounded-xl bg-white px-4 py-3">
                <label htmlFor="q" className="block text-xs font-semibold text-navy-soft">Business name</label>
                <input id="q" name="q" required minLength={2} maxLength={80} defaultValue={q} autoComplete="organization"
                       placeholder="Bluebonnet Florals" className="mt-0.5 block w-full border-0 bg-transparent p-0 text-lg text-navy placeholder:text-navy-soft/60 focus-visible:outline-none" />
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <label htmlFor="where" className="block text-xs font-semibold text-navy-soft">City or ZIP</label>
                <input id="where" name="where" maxLength={80} defaultValue={where} autoComplete="address-level2"
                       placeholder="Dallas, TX" className="mt-0.5 block w-full border-0 bg-transparent p-0 text-lg text-navy placeholder:text-navy-soft/60 focus-visible:outline-none" />
              </div>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-royal px-6 py-4 text-lg font-semibold text-white hover:bg-navy">
                <Search aria-hidden="true" className="h-5 w-5" /> Find it
              </button>
            </div>
          </form>
          <p className="mt-4 text-sm text-mist">Free to claim your business and see your matches.</p>
        </div>
      </section>
      <section className="bg-cloud">
        <div className="container-page py-12 sm:py-16">
          {q.trim().length >= 2 ? <Results q={q} where={where} /> : <AddYours />}
        </div>
      </section>
    </>
  );
}

async function Results({ q, where }: { q: string; where: string }) {
  const ready = await readiness();
  if (!ready.claimsOpen || !ready.members || !ready.listings) return null; // the layout shows "coming soon"
  if (!(await allow("claim-search", 60, 30))) {
    return <p role="alert" className="text-lg">You&rsquo;ve searched a lot in the last minute. Please wait a moment and try again.</p>;
  }
  const location = where.trim() ? await resolveLocation(where) : null;
  const near = location?.status === "found" ? location.place : location?.status === "choose" ? location.options[0] : null;
  const results = await searchClaimable(q, near);
  return (
    <>
      <h2 className="text-2xl" role="status">
        {results.length ? `Is it one of these?` : `We couldn’t find “${q}”${near ? ` near ${near.label}` : ""}.`}
      </h2>
      {results.length > 0 && (
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          {results.map((r) => (
            <li key={r.id}>
              <Link href={r.ref ? `/claim/${r.ref}` : "/contact"} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-ice">
                <span className="min-w-0">
                  <span className="block truncate text-lg font-semibold">{r.name}</span>
                  <span className="block text-sm text-navy-soft">
                    {[r.category_label, [r.street, r.locality, r.region].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {r.owned ? (
                  <span className="shrink-0 rounded-full bg-cloud px-3 py-1 text-sm font-semibold text-navy-soft">{stateLabels[r.state]}</span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-royal">
                    Claim <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <AddYours />
    </>
  );
}

function AddYours() {
  return (
    <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl bg-white p-6 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-lg font-semibold">Can&rsquo;t find your business?</p>
        <p className="text-navy-soft">Home-based or new? Add it in a minute.</p>
      </div>
      <Link href="/claim/new" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-royal ring-1 ring-inset ring-royal hover:bg-ice">
        <Plus aria-hidden="true" className="h-5 w-5" /> Add your business
      </Link>
    </div>
  );
}
