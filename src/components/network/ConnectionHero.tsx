"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Heart } from "lucide-react";
import { CategoryIcon } from "./CategoryIcon";
import { FindForm } from "./FindForm";

/** label: chip name; search: what goes in the search box. */
export type HeroCategory = { id: string; label: string; search: string; plural: string };
export type HeroFit = { b: string; reason: string; strength: number };

/**
 * "Show the click": pick what your business does and see which kinds of
 * businesses fit it, joined by lines that snap into place. Category-level
 * pairings and reasons only (the same rules the matching uses): never a
 * business name. The visual is decorative; the list beside it carries the
 * same information for screen readers, phones and reduced motion.
 */
export function ConnectionHero({
  categories,
  fits,
  names,
  initial,
  journey,
}: {
  categories: HeroCategory[];
  /** Display names for every category a pairing may point to. */
  names: Record<string, string>;
  fits: Record<string, HeroFit[]>;
  initial: string;
  /** The illustrative couple's journey: category ids in a typical order. */
  journey: { id: string; label: string }[];
}) {
  const [picked, setPicked] = useState(initial);
  const cat = categories.find((c) => c.id === picked) ?? categories[0];
  const byId = new Map(categories.map((c) => [c.id, c]));
  const links = [...(fits[cat.id] ?? [])].sort((a, b) => b.strength - a.strength).slice(0, 6);
  const linked = new Set(links.map((l) => l.b));
  const chips = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving focus for the chip radiogroup: arrows move and select, like native radios.
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + categories.length) % categories.length;
    setPicked(categories[next].id);
    chips.current[next]?.focus();
  };

  const label = (id: string) => names[id] ?? byId.get(id)?.label ?? id.replace(/_/g, " ");

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-b from-ice/70 via-white to-white">
        {/* Faint dot texture: decoration only. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:radial-gradient(rgb(1_19_53/0.10)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]" />
        <div className="container-page relative pb-12 pt-8 sm:pb-16 sm:pt-12">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Get referrals from wedding businesses near you.</h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-navy-soft sm:text-lg">
              Find photographers, planners, florists and venues who could send business your way.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl">
            <p id="hero-pick" className="text-center text-sm font-semibold">What does your business do?</p>
            <div role="radiogroup" aria-labelledby="hero-pick" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
              {categories.map((c, i) => {
                const on = c.id === cat.id;
                return (
                  <button
                    key={c.id}
                    ref={(el) => { chips.current[i] = el; }}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => setPicked(c.id)}
                    onKeyDown={(e) => onKey(e, i)}
                    className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                      on ? "bg-navy text-white" : "bg-white text-navy ring-1 ring-line hover:ring-navy"
                    }`}
                  >
                    <CategoryIcon id={c.id} className="h-4 w-4" />
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <div>
                <p className="text-center text-lg font-semibold" aria-live="polite">
                  {links.length > 0
                    ? `${cat.plural.charAt(0).toUpperCase()}${cat.plural.slice(1)} connect with ${links.length} kinds of wedding businesses.`
                    : `We're still mapping who fits ${cat.plural}.`}
                </p>
                <Diagram key={cat.id} center={cat} links={links} label={label} />
                {/* The same pairings as a list: shown on phones, read by screen readers everywhere. */}
                <ul className="mx-auto mt-4 max-w-md space-y-3 sm:sr-only">
                  {links.map((l, i) => (
                    <li key={l.b} className="flex items-start gap-3 motion-safe:animate-[sc-rise_420ms_cubic-bezier(.34,1.56,.64,1)_both]" style={{ animationDelay: `${120 + i * 60}ms` }}>
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${i % 2 ? "bg-ice text-royal" : "bg-navy text-white"}`}>
                        <CategoryIcon id={l.b} className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block font-semibold">{cat.label} + {label(l.b)}</span>
                        <span className="block text-sm text-navy-soft">{l.reason}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-10 w-full max-w-4xl">
            <p className="mb-3 text-center text-sm font-semibold">See the {cat.label.toLowerCase()} matches near you</p>
            <FindForm key={cat.id} what={cat.search} />
          </div>
        </div>
      </div>

      <Journey journey={journey} picked={cat.id} linked={linked} pickedLabel={cat.label} />
    </>
  );
}

/**
 * The picked category in the middle, ringed by the two halves of the S
 * (navy and blue), with complementary categories around it. Lines draw in
 * and nodes snap into place; with reduced motion everything simply appears.
 * Decorative: the list next to it says the same thing.
 */
function Diagram({ center, links, label }: { center: HeroCategory; links: HeroFit[]; label: (id: string) => string }) {
  const W = 600;
  const H = 420;
  const cx = W / 2;
  const cy = H / 2;
  const pts = links.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(links.length, 1) + (links.length % 2 ? 0 : Math.PI / links.length);
    return { x: cx + 205 * Math.cos(a), y: cy + 150 * Math.sin(a) };
  });
  return (
    <div aria-hidden="true" className="relative mx-auto hidden aspect-[600/420] w-full max-w-[600px] sm:block">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
        {pts.map((p, i) => {
          const len = Math.hypot(p.x - cx, p.y - cy);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={i % 2 ? "#0070FE" : "#011335"}
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray={len}
              style={{ ["--len" as string]: len, animationDelay: `${i * 60}ms` }}
              className="motion-safe:animate-[sc-draw_520ms_cubic-bezier(.65,0,.35,1)_both]"
            />
          );
        })}
        {/* The S halves: navy above, blue below. */}
        <path d={`M ${cx - 62} ${cy} A 62 62 0 0 1 ${cx + 62} ${cy}`} fill="none" stroke="#011335" strokeWidth={6} strokeLinecap="round" />
        <path d={`M ${cx + 62} ${cy} A 62 62 0 0 1 ${cx - 62} ${cy}`} fill="none" stroke="#0070FE" strokeWidth={6} strokeLinecap="round" />
      </svg>
      <div className="absolute left-1/2 top-1/2 grid h-[104px] w-[104px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-center shadow-[0_8px_30px_rgba(1,19,53,0.12)] motion-safe:animate-[sc-pop_360ms_cubic-bezier(.34,1.56,.64,1)_both]">
        <span>
          <CategoryIcon id={center.id} className="mx-auto h-6 w-6 text-royal" />
          <span className="mt-1 block px-2 text-xs font-bold leading-tight">{center.label}</span>
        </span>
      </div>
      {links.map((l, i) => (
        <div
          key={l.b}
          className="absolute w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-3 text-left shadow-[0_6px_24px_rgba(1,19,53,0.10)] ring-1 ring-line motion-safe:animate-[sc-snap_440ms_cubic-bezier(.34,1.56,.64,1)_both]"
          style={{ left: `${(pts[i].x / W) * 100}%`, top: `${(pts[i].y / H) * 100}%`, animationDelay: `${220 + i * 70}ms` }}
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <CategoryIcon id={l.b} className={`h-4 w-4 shrink-0 ${i % 2 ? "text-royal" : "text-navy"}`} />
            {label(l.b)}
          </span>
          <span className="mt-1 block text-xs leading-snug text-navy-soft">{l.reason}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * An illustrative couple's journey, not a rule: where the picked business
 * sits, and which complementary businesses serve the couple before and after.
 * Scrolls sideways on phones; the line fills as it scrolls into view where the
 * browser supports scroll-driven animation (and never with reduced motion).
 */
function Journey({ journey, picked, linked, pickedLabel }: { journey: { id: string; label: string }[]; picked: string; linked: Set<string>; pickedLabel: string }) {
  const steps = [{ id: "engagement", label: "Engagement" }, ...journey, { id: "wedding_day", label: "Wedding day" }];
  const inJourney = steps.some((s) => s.id === picked);
  return (
    <section aria-labelledby="journey-heading" className="bg-white py-14 sm:py-20">
      <div className="container-page">
        <h2 id="journey-heading" className="max-w-2xl text-2xl font-bold sm:text-3xl">The same couple, at different moments.</h2>
        <p className="mt-2 max-w-2xl text-navy-soft">
          One couple meets many wedding businesses on the way to the day. Here&rsquo;s a typical path; every couple&rsquo;s order is
          different.{" "}
          {inJourney ? (
            <>
              <span className="font-semibold text-navy">{pickedLabel}</span> is highlighted, with the businesses that fit it.
            </>
          ) : (
            <>Businesses that fit a {pickedLabel.toLowerCase()} are highlighted.</>
          )}
        </p>
        <div className="-mx-4 mt-8 overflow-x-auto px-4 pb-4 [scroll-snap-type:x_mandatory] sm:mx-0 sm:px-0">
          <ol className="relative flex min-w-[56rem] items-start justify-between gap-2">
            <span aria-hidden="true" className="absolute left-6 right-6 top-6 h-0.5 bg-line" />
            <span
              aria-hidden="true"
              className="sc-journey-fill absolute left-6 right-6 top-6 h-0.5 origin-left bg-gradient-to-r from-navy to-royal"
            />
            {steps.map((s) => {
              const isPicked = s.id === picked;
              const isLinked = linked.has(s.id);
              return (
                <li key={s.id} className="relative flex w-24 shrink-0 flex-col items-center text-center [scroll-snap-align:center]">
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full transition-all duration-300 ${
                      isPicked
                        ? "scale-110 bg-navy text-white shadow-[0_6px_20px_rgba(1,19,53,0.25)]"
                        : isLinked
                          ? "bg-white text-royal ring-2 ring-royal"
                          : "bg-white text-navy-soft ring-1 ring-line"
                    }`}
                  >
                    {s.id === "engagement" ? <CategoryIcon id="jewelers" className="h-5 w-5" /> : s.id === "wedding_day" ? <Heart aria-hidden="true" className="h-5 w-5" /> : <CategoryIcon id={s.id} className="h-5 w-5" />}
                  </span>
                  <span className={`mt-2 text-sm ${isPicked ? "font-bold" : isLinked ? "font-semibold" : "text-navy-soft"}`}>{s.label}</span>
                  {isPicked && <span className="sr-only">(your business)</span>}
                  {isLinked && !isPicked && <span className="sr-only">(fits your business)</span>}
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-navy-soft">
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-navy" />Your business</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full ring-2 ring-royal" />Businesses that fit yours</span>
        </p>
      </div>
    </section>
  );
}
