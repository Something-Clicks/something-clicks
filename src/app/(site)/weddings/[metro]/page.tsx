import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { CtaBand } from "@/components/CtaBand";
import { CategoryIcon } from "@/components/network/CategoryIcon";
import { CategoryMatchCard } from "@/components/network/CategoryMatchCard";
import { FindForm } from "@/components/network/FindForm";
import { categoryById, categorySlug, partnershipLabels } from "@/content/journeys";
import { metroBySlug, metros } from "@/content/metros";
import { formatAtLeast } from "@/content/network";
import { dbConfigured } from "@/lib/db";
import { breadcrumbJsonLd, JsonLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/metadata";
import { categoryPageEligible, complementRules, metroCounts } from "@/lib/network/metros";
import { resolveLocation, searchMatches, SEARCH_RADIUS_MILES } from "@/lib/network/search";

// Counts change when data is imported; refresh hourly (and redeploy after a load).
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return metros.map((m) => ({ metro: m.slug }));
}

type Params = { params: Promise<{ metro: string }> };

export async function generateMetadata({ params }: Params) {
  const m = metroBySlug((await params).metro);
  if (!m) return {};
  return pageMeta({
    title: `Wedding businesses in ${m.name}`,
    path: `/weddings/${m.slug}`,
    description: `See which ${m.name} wedding businesses fit yours, and why. Request an introduction and grow together. Free to claim your business and see your matches.`,
  });
}

/** Partnership ideas, each with a pairing that's common in every metro. */
const ideas = [
  { type: "referral", a: "wedding_planners", b: "photographers", body: "A planner sends couples to a photographer they trust. The photographer sends couples back." },
  { type: "joint_offer", a: "florists", b: "event_rentals", body: "A florist and a rental company offer one package for arches, linens and flowers." },
  { type: "distribution", a: "bridal_shops", b: "hair_makeup", body: "A bridal shop shares a hair and makeup artist's trial offer at fittings." },
] as const;

const MIN_TILE = 10;

const progress = ["Matched", "Introduced", "Connected", "Partnership live"];

export default async function MetroPage({ params }: Params) {
  const m = metroBySlug((await params).metro);
  if (!m) notFound();
  const [counts, example, rules] = dbConfigured()
    ? await Promise.all([metroCounts(m.cluster).catch(() => []), exampleResults(m.where), complementRules().catch(() => [])])
    : [[], null, []];
  const byId = Object.fromEntries(counts.map((c) => [c.category_id, c.n]));
  const total = counts.reduce((s, c) => s + c.n, 0);
  // A tile for every category with a meaningful number; a lone confirmed salon reads as noise.
  const tiles = counts.filter((c) => c.n >= MIN_TILE);

  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-20 sm:py-28">
          <h1 className="max-w-3xl text-5xl leading-[1.05] sm:text-7xl">Weddings in {m.name}.</h1>
          <p className="mt-6 max-w-xl text-xl text-mist">
            {total > 0 ? `${formatAtLeast(total)} wedding businesses. See which ones fit yours.` : "See which local wedding businesses fit yours."}
          </p>
          <div className="mt-10 max-w-4xl">
            <FindForm where={m.where} />
          </div>
          <p className="mt-4 text-sm text-mist">Free to claim your business and see your matches.</p>
        </div>
      </section>

      {tiles.length === 0 && (
        <section className="bg-white py-16 sm:py-20" aria-labelledby="here-heading">
          <div className="container-page max-w-2xl text-center">
            <h2 id="here-heading" className="text-4xl">{m.name} is coming soon.</h2>
            <p className="mt-3 text-lg text-navy-soft">
              We&rsquo;re loading {m.name}&rsquo;s wedding businesses now. Check back shortly to see who&rsquo;s here and who fits yours.
            </p>
          </div>
        </section>
      )}

      {tiles.length > 0 && (
        <section className="bg-white py-20 sm:py-28" aria-labelledby="here-heading">
          <div className="container-page">
            <h2 id="here-heading" className="text-4xl sm:text-5xl">Who&rsquo;s here.</h2>
            <p className="mt-3 text-lg text-navy-soft">Wedding businesses across {m.name}, by what they do.</p>
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {tiles.map((c) => {
                const cat = categoryById(c.category_id);
                if (!cat) return null;
                const body = (
                  <>
                    <CategoryIcon id={c.category_id} className="h-6 w-6 shrink-0 text-royal" />
                    <span>
                      <span className="block text-2xl font-semibold tabular-nums">{c.n.toLocaleString()}</span>
                      <span className="block text-sm text-navy-soft">{cat.plural}</span>
                    </span>
                  </>
                );
                return (
                  <li key={c.category_id}>
                    {categoryPageEligible(byId, rules, c.category_id) ? (
                      <Link href={`/weddings/${m.slug}/${categorySlug(c.category_id)}`} className="flex h-full items-center gap-3 rounded-2xl bg-cloud p-4 ring-1 ring-transparent hover:ring-royal">
                        {body}
                      </Link>
                    ) : (
                      <div className="flex h-full items-center gap-3 rounded-2xl bg-cloud p-4">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-sm text-navy-soft">
              Live counts from <Link href="/data-sources" className="underline">public business listings</Link>. We don&rsquo;t publish a
              directory: owners see names once they claim their business.
            </p>
          </div>
        </section>
      )}

      {example && example.results.length > 0 && (
        <section className="bg-cloud py-20 sm:py-28" aria-labelledby="fits-heading">
          <div className="container-page">
            <h2 id="fits-heading" className="text-4xl sm:text-5xl">See who fits.</h2>
            <p className="mt-3 text-lg text-navy-soft">A real search: photographers near {example.place}.</p>
            <ul className="mt-10 grid gap-6 md:grid-cols-3">
              {example.results.map((r) => (
                <li key={r.category.id}>
                  <CategoryMatchCard r={r} radiusMiles={SEARCH_RADIUS_MILES} claimHref={`/matches?${new URLSearchParams({ what: "Photographer", where: m.where })}`} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="bg-white py-20 sm:py-28" aria-labelledby="work-heading">
        <div className="container-page">
          <h2 id="work-heading" className="text-4xl sm:text-5xl">How partnerships work.</h2>
          <p className="mt-3 text-lg text-navy-soft">Both businesses agree, both see the results.</p>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {ideas.map((i) => (
              <li key={i.type} className="rounded-2xl bg-cloud p-7">
                <div className="flex gap-2 text-royal" aria-hidden="true">
                  <CategoryIcon id={i.a} className="h-6 w-6" />
                  <span>+</span>
                  <CategoryIcon id={i.b} className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-2xl">{partnershipLabels[i.type]}.</h3>
                <p className="mt-2 text-lg text-navy-soft">{i.body}</p>
              </li>
            ))}
          </ul>
          <ol className="mt-12 grid gap-3 rounded-2xl bg-ice p-6 sm:grid-cols-4 sm:p-8" aria-label="Partnership progress">
            {progress.map((p, n) => (
              <li key={p} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-white">
                  {n < 3 ? <Check aria-hidden="true" className="h-4 w-4" /> : <span aria-hidden="true" className="h-2 w-2 rounded-full bg-white" />}
                </span>
                <span className="font-medium">{p}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-navy-soft">Partner offers are always disclosed to customers.</p>
        </div>
      </section>

      <section className="bg-cloud py-14" aria-labelledby="other-heading">
        <div className="container-page">
          <h2 id="other-heading" className="text-xl">Also live in</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {metros.filter((o) => o.slug !== m.slug).map((o) => (
              <li key={o.slug}>
                <Link href={`/weddings/${o.slug}`} className="inline-block rounded-full bg-white px-4 py-2 font-semibold text-navy ring-1 ring-line hover:bg-ice">{o.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Cities", path: "/weddings" }, { name: m.name, path: `/weddings/${m.slug}` }])} />
    </>
  );
}

async function exampleResults(where: string) {
  try {
    const location = await resolveLocation(where);
    const category = categoryById("photographers");
    if (location.status !== "found" || !category) return null;
    return { place: location.place.label, results: await searchMatches(category.id, location.place, 3) };
  } catch {
    return null;
  }
}
