"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";
import { FindForm } from "./FindForm";

export type DiscoverMetro = { slug: string; name: string; short: string; where: string; cluster: string };
/** label: short tile name; one: "a florist"; search: what goes in the search box. */
export type DiscoverCategory = { id: string; label: string; one: string; search: string; plural: string };
export type DiscoverFit = { b: string; reason: string; type: string; strength: number };

/**
 * The homepage: search first, then "What do you do?" tiles with live counts
 * for the chosen city. Tapping a tile shows the kinds of businesses that fit
 * that one, with real counts. Counts and pairings only: never business names.
 * Without JavaScript the tiles are plain links to the same search.
 */
export function HomeDiscover({
  metros,
  categories,
  counts,
  fits,
  partnershipLabels,
  tagline,
}: {
  metros: DiscoverMetro[];
  categories: DiscoverCategory[];
  counts: Record<string, Record<string, number>>;
  fits: Record<string, DiscoverFit[]>;
  partnershipLabels: Record<string, string>;
  tagline: string;
}) {
  const [metroSlug, setMetroSlug] = useState(metros[0].slug);
  const [picked, setPicked] = useState<string | null>(null);
  const metro = metros.find((m) => m.slug === metroSlug)!;
  const c = counts[metro.cluster] ?? {};
  const tiles = categories.filter((cat) => (c[cat.id] ?? 0) > 0);
  const pickedCat = picked ? categories.find((cat) => cat.id === picked) : undefined;
  const pickedFits = picked
    ? (fits[picked] ?? []).filter((f) => (c[f.b] ?? 0) > 0).sort((x, y) => y.strength - x.strength || (c[y.b] ?? 0) - (c[x.b] ?? 0)).slice(0, 8)
    : [];
  const searchHref = (label: string) => `/matches?${new URLSearchParams({ what: label, where: metro.where })}`;

  return (
    <>
      <div className="mx-auto w-full max-w-4xl">
        <FindForm key={`${metroSlug}-${picked ?? ""}`} what={pickedCat?.search ?? ""} where={metro.where} />
        <p className="mt-3 text-center text-sm font-medium text-navy-soft">{tagline}</p>
      </div>

      <section aria-labelledby="discover-heading" className="mt-10 sm:mt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {pickedCat ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-navy ring-1 ring-line hover:bg-cloud"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All categories
              </button>
              <h2 id="discover-heading" className="text-xl font-bold sm:text-2xl">
                Fits {pickedCat.one} near {metro.name}
              </h2>
            </div>
          ) : (
            <h2 id="discover-heading" className="text-xl font-bold sm:text-2xl">What do you do?</h2>
          )}
          <div role="group" aria-label="City" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
            {metros.map((m) => (
              <button
                key={m.slug}
                type="button"
                aria-pressed={m.slug === metroSlug}
                onClick={() => setMetroSlug(m.slug)}
                className="h-9 shrink-0 rounded-full px-3.5 text-sm font-medium text-navy ring-1 ring-line hover:ring-navy aria-pressed:bg-navy aria-pressed:text-white aria-pressed:ring-navy"
              >
                {m.short}
              </button>
            ))}
          </div>
        </div>

        {!pickedCat && (
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7 lg:gap-3.5">
            {tiles.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={searchHref(cat.search)}
                  onClick={(e) => {
                    e.preventDefault();
                    setPicked(cat.id);
                  }}
                  className="flex h-full flex-col items-start gap-2.5 rounded-3xl bg-white p-4 ring-1 ring-line transition-shadow hover:shadow-[0_4px_18px_rgba(1,19,53,0.08)] hover:ring-royal"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ice text-royal">
                    <CategoryIcon id={cat.id} />
                  </span>
                  <span className="font-bold">{cat.label}</span>
                  <span className="text-sm leading-snug text-navy-soft">
                    <span className="font-bold text-navy tabular-nums">{c[cat.id].toLocaleString("en-US")}</span> near {metro.name}
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/claim"
                className="flex h-full flex-col justify-center gap-1 rounded-3xl border border-dashed border-field p-4 hover:border-navy"
              >
                <span className="font-bold">Not listed?</span>
                <span className="text-sm text-navy-soft">Add your business</span>
              </Link>
            </li>
          </ul>
        )}

        {pickedCat && (
          <>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-3.5">
              {pickedFits.map((f) => {
                const cat = categories.find((x) => x.id === f.b);
                if (!cat) return null;
                return (
                  <li key={f.b} className="flex gap-3 rounded-3xl bg-white p-4 ring-1 ring-line sm:flex-col sm:gap-2.5 sm:p-5">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ice text-royal">
                      <CategoryIcon id={f.b} />
                    </span>
                    <span className="flex flex-col gap-1">
                      <span>
                        <span className="text-2xl font-bold tracking-tight text-navy tabular-nums">{c[f.b].toLocaleString("en-US")}</span>{" "}
                        <span className="font-semibold">{cat.plural}</span>
                      </span>
                      <span className="text-sm">{f.reason}</span>
                      <span className="text-xs font-semibold text-navy-soft">{partnershipLabels[f.type]}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <Link
              href={searchHref(pickedCat.search)}
              className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-navy px-6 font-semibold text-white hover:bg-navy/90"
            >
              See your matches <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>
          </>
        )}
        <p className="mt-4 text-sm text-navy-soft">Counts only. Names stay private until a business is claimed.</p>
      </section>
    </>
  );
}
