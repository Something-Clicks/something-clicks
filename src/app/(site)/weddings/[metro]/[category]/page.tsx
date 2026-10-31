import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/network/CategoryIcon";
import { FindForm } from "@/components/network/FindForm";
import { activeJourneys, categoryBySlug, categorySlug, partnershipLabels, reasonText, type PartnershipType } from "@/content/journeys";
import { metroBySlug, metros } from "@/content/metros";
import { dbConfigured } from "@/lib/db";
import { breadcrumbJsonLd, JsonLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/metadata";
import { allMetroCounts, categoryPageEligible, complementRules } from "@/lib/network/metros";

// Counts change when data is imported; refresh hourly.
export const revalidate = 3600;

type Params = { params: Promise<{ metro: string; category: string }> };

/** Every city × category with enough real data. Empty when the database isn't reachable at build time. */
export async function generateStaticParams() {
  if (!dbConfigured()) return [];
  try {
    const [counts, rules] = await Promise.all([allMetroCounts(), complementRules()]);
    return metros.flatMap((m) =>
      Object.keys(counts[m.cluster] ?? {})
        .filter((id) => categoryPageEligible(counts[m.cluster], rules, id))
        .map((id) => ({ metro: m.slug, category: categorySlug(id) })),
    );
  } catch {
    return [];
  }
}

async function load(params: Params["params"]) {
  const { metro: metroSlug, category: slug } = await params;
  const m = metroBySlug(metroSlug);
  const cat = categoryBySlug(slug);
  if (!m || !cat || cat.broad || !dbConfigured()) return null;
  const [all, rules] = await Promise.all([allMetroCounts().catch(() => ({}) as Record<string, Record<string, number>>), complementRules().catch(() => [])]);
  const counts = all[m.cluster] ?? {};
  if (!categoryPageEligible(counts, rules, cat.id)) return null;
  return { m, cat, counts, rules, all };
}

export async function generateMetadata({ params }: Params) {
  const d = await load(params);
  if (!d) return {};
  const { m, cat, counts } = d;
  const n = counts[cat.id].toLocaleString("en-US");
  return pageMeta({
    title: `${capitalize(cat.plural)} in ${m.name}: who fits, and why`,
    path: `/weddings/${m.slug}/${categorySlug(cat.id)}`,
    description: `${n} wedding ${cat.plural} in ${m.name}. See which local wedding businesses fit ${article(cat.label)} ${lower(cat.label)}, why, and how they work together.`,
  });
}

export default async function CityCategoryPage({ params }: Params) {
  const d = await load(params);
  if (!d) notFound();
  const { m, cat, counts, rules, all } = d;
  const journeyId = activeJourneys()[0]?.id ?? "";
  const fits = rules
    .filter((r) => r.a === cat.id && (counts[r.b] ?? 0) > 0)
    .sort((x, y) => y.strength - x.strength || (counts[y.b] ?? 0) - (counts[x.b] ?? 0));
  const path = `/weddings/${m.slug}/${categorySlug(cat.id)}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Cities", path: "/weddings" },
    { name: m.name, path: `/weddings/${m.slug}` },
    { name: capitalize(cat.plural), path },
  ];
  const otherCities = metros.filter((o) => o.slug !== m.slug && categoryPageEligible(all[o.cluster] ?? {}, rules, cat.id));
  const otherCategories = Object.keys(counts).filter((id) => id !== cat.id && categoryPageEligible(counts, rules, id));

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="container-page py-8 sm:py-10">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-navy-soft">
              {crumbs.slice(1).map((c, i, arr) => (
                <li key={c.path} className="flex items-center gap-1">
                  {i < arr.length - 1 ? (
                    <Link href={c.path} className="hover:text-navy hover:underline">{c.name}</Link>
                  ) : (
                    <span aria-current="page" className="font-semibold text-navy">{c.name}</span>
                  )}
                  {i < arr.length - 1 && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />}
                </li>
              ))}
            </ol>
          </nav>
          <div className="mt-5 flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ice text-royal">
              <CategoryIcon id={cat.id} className="h-7 w-7" />
            </span>
            <h1 className="text-3xl font-bold sm:text-4xl">{capitalize(cat.plural)} in {m.name}</h1>
          </div>
          <p className="mt-3 text-lg text-navy-soft">
            <span className="font-bold text-navy tabular-nums">{counts[cat.id].toLocaleString("en-US")}</span> wedding {cat.plural} across{" "}
            {m.name}. Here&rsquo;s who fits {article(cat.label)} {lower(cat.label)}, and why.
          </p>
        </div>
      </section>

      <section className="bg-cloud py-10 sm:py-14" aria-labelledby="fits-heading">
        <div className="container-page">
          <h2 id="fits-heading" className="text-xl font-bold sm:text-2xl">Who fits {article(cat.label)} {lower(cat.label)}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fits.map((f) => {
              const b = categoryBySlug(categorySlug(f.b));
              if (!b) return null;
              return (
                <li key={f.b} className="flex gap-4 rounded-3xl bg-white p-5 ring-1 ring-line">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ice text-royal">
                    <CategoryIcon id={f.b} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span>
                      <span className="text-2xl font-bold tracking-tight tabular-nums">{counts[f.b].toLocaleString("en-US")}</span>{" "}
                      <span className="font-semibold">{b.plural}</span>
                    </span>
                    <span>{reasonText(journeyId, f.reason_key)}</span>
                    <span className="text-sm font-semibold text-navy-soft">{partnershipLabels[f.partnership_type as PartnershipType]}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-navy-soft">
            Live counts from <Link href="/data-sources" className="underline">public business listings</Link>. We don&rsquo;t publish a
            directory: owners see names once they claim their business.
          </p>
        </div>
      </section>

      <section className="bg-white py-10 sm:py-14" aria-labelledby="search-heading">
        <div className="container-page">
          <h2 id="search-heading" className="text-xl font-bold sm:text-2xl">See your matches</h2>
          <div className="mt-5 max-w-4xl">
            <FindForm what={cat.label} where={m.where} compact />
          </div>
        </div>
      </section>

      <section className="bg-cloud py-10" aria-labelledby="more-heading">
        <div className="container-page grid gap-8 md:grid-cols-2">
          <div>
            <h2 id="more-heading" className="text-lg font-bold">More in {m.name}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {otherCategories.map((id) => {
                const o = categoryBySlug(categorySlug(id));
                return o ? (
                  <li key={id}>
                    <Link href={`/weddings/${m.slug}/${categorySlug(id)}`} className="inline-block rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-navy ring-1 ring-line hover:ring-navy">
                      {capitalize(o.plural)}
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
          {otherCities.length > 0 && (
          <div>
            <h2 className="text-lg font-bold">{capitalize(cat.plural)} in other cities</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {otherCities.map((o) => (
                <li key={o.slug}>
                  <Link href={`/weddings/${o.slug}/${categorySlug(cat.id)}`} className="inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-navy ring-1 ring-line hover:ring-navy">
                    {o.name} <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          )}
        </div>
      </section>

      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lower = (label: string) => (/^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label);
const article = (label: string) => (/^[aeiou]/i.test(label) ? "an" : "a");
