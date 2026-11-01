import { Faq } from "@/components/Faq";
import { FindForm } from "@/components/network/FindForm";
import { ConnectionHero } from "@/components/network/ConnectionHero";
import { HomeDiscover, type DiscoverFit } from "@/components/network/HomeDiscover";
import { faqJsonLd } from "@/content/faq";
import { activeJourneys, partnershipLabels, reasonText } from "@/content/journeys";
import { metros } from "@/content/metros";
import { site } from "@/content/site";
import { dbConfigured } from "@/lib/db";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/metadata";
import { allMetroCounts, complementRules } from "@/lib/network/metros";

export const metadata = pageMeta({
  title: "Home",
  path: "/",
  description:
    site.description,
});

// Rendered on request, never at build: data comes from the hourly cache in lib/network/metros.
export const dynamic = "force-dynamic";

const steps = ["Claim your business", "See who fits", "Get introduced", "Send each other referrals and grow together."];

const ORDER = [
  "wedding_planners", "wedding_venues", "photographers", "videographers", "florists", "hair_makeup", "caterers",
  "cake_makers", "djs_music", "event_rentals", "limos", "bridal_shops", "stationers",
];

export default async function HomePage() {
  const journey = activeJourneys()[0];
  const [counts, rules] = dbConfigured()
    ? await Promise.all([allMetroCounts().catch(() => ({})), complementRules().catch(() => [])])
    : [{}, []];
  const hasCounts = Object.keys(counts).length > 0;
  const categories = (journey?.categories ?? []).filter((c) => !c.broad).sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const fits: Record<string, DiscoverFit[]> = {};
  for (const r of rules) {
    (fits[r.a] ??= []).push({ b: r.b, reason: reasonText(journey?.id ?? "", r.reason_key), type: r.partnership_type, strength: r.strength });
  }

  const discover = hasCounts && (
    <HomeDiscover
      metros={metros.map(({ slug, name, short, where, cluster }) => ({ slug, name, short, where, cluster }))}
      categories={categories.map((c) => ({ id: c.id, label: TILE[c.id] ?? c.label, one: singular(c.label), search: c.label, plural: c.plural }))}
      counts={counts}
      fits={fits}
      partnershipLabels={partnershipLabels}
      search={rules.length === 0}
      heading={rules.length ? "Live counts near you" : undefined}
    />
  );
  const heroCats = HERO.flatMap(({ id, label }) => {
    const c = categories.find((x) => x.id === id);
    return c ? [{ id, label, search: c.label, plural: c.plural }] : [];
  });

  return (
    <>
      {rules.length > 0 && heroCats.length > 0 ? (
        <>
          <ConnectionHero
            categories={heroCats}
            names={Object.fromEntries(categories.map((c) => [c.id, TILE[c.id] ?? c.label]))}
            fits={fits}
            initial="photographers"
            journey={JOURNEY}
          />
          {discover && (
            <div className="bg-white">
              <div className="container-page pb-12 sm:pb-16">{discover}</div>
            </div>
          )}
        </>
      ) : (
      <div className="bg-white">
        <div className="container-page pb-12 pt-6 sm:pb-16 sm:pt-10">
          <div className="mx-auto mb-6 w-full max-w-4xl sm:mb-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Get referrals from wedding businesses near you.</h1>
            <p className="mt-2 text-sm text-navy-soft sm:text-base">
              Find photographers, planners, florists and venues who could send business your way.
            </p>
          </div>
          {discover || (
            <div className="mx-auto w-full max-w-4xl">
              <FindForm />
            </div>
          )}
        </div>
      </div>
      )}

      <div className="bg-cloud py-12 sm:py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_2fr]">
          <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20">
            <h2 id="how-heading" className="text-xl font-bold sm:text-2xl">How it works</h2>
            <ol className="mt-4 space-y-3">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white" aria-hidden="true">{i + 1}</span>
                  <span className="font-medium">{s}</span>
                </li>
              ))}
            </ol>
          </section>
          <Faq />
        </div>
      </div>

      <JsonLd data={[organizationJsonLd(), websiteJsonLd(), faqJsonLd()]} />
    </>
  );
}

/** The hero's "What does your business do?" choices, in this order. */
const HERO = [
  { id: "photographers", label: "Photographer" },
  { id: "florists", label: "Florist" },
  { id: "wedding_venues", label: "Venue" },
  { id: "wedding_planners", label: "Planner" },
  { id: "caterers", label: "Caterer" },
  { id: "djs_music", label: "DJ" },
  { id: "videographers", label: "Videographer" },
  { id: "hair_makeup", label: "Hair and makeup" },
  { id: "event_rentals", label: "Wedding rentals" },
];

/** An illustrative couple's journey (not a rule): engagement and the wedding day are added around these. */
const JOURNEY = [
  { id: "wedding_venues", label: "Venue" },
  { id: "wedding_planners", label: "Planner" },
  { id: "bridal_shops", label: "Attire" },
  { id: "photographers", label: "Photographer" },
  { id: "florists", label: "Florist" },
  { id: "cake_makers", label: "Cake" },
  { id: "djs_music", label: "DJ" },
];

/** Short tile names; everything else (search, results) uses the category's own label and plural. */
const TILE: Record<string, string> = {
  wedding_planners: "Planners", wedding_venues: "Venues", photographers: "Photographers", videographers: "Videographers",
  florists: "Florists", hair_makeup: "Hair & makeup", caterers: "Caterers", cake_makers: "Cakes", djs_music: "DJs & music",
  event_rentals: "Rentals", limos: "Limos", bridal_shops: "Bridal", stationers: "Stationery",
};

/** "Wedding planner" -> "a wedding planner", "Event rental company" -> "an event rental company", "DJ or musician" stays capitalized. */
function singular(label: string) {
  const one = /^[A-Z][a-z]/.test(label) ? label.charAt(0).toLowerCase() + label.slice(1) : label;
  return `${/^[aeiou]/i.test(one) ? "an" : "a"} ${one}`;
}
