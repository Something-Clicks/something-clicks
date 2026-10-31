import Link from "next/link";
import { dbConfigured } from "@/lib/db";
import { pageMeta } from "@/lib/metadata";
import { overtureRelease } from "@/lib/network/removals";

export const metadata = pageMeta({
  title: "Data sources",
  path: "/data-sources",
  description: "Where Something Clicks business listings come from, their licenses, and how to remove a business.",
});

// Reflects the latest import; refresh hourly.
export const revalidate = 3600;

/** The Foursquare NOTICE.txt that Overture's attribution page links for the Foursquare places data. */
const OVERTURE_NOTICE_URL = "https://opensource.foursquare.com/places-notice-txt/";

const CDLA = { name: "CDLA Permissive 2.0", url: "https://cdla.dev/permissive-2-0/" };

/** Places sources and credits, as stated in Overture's attribution requirements. */
const SOURCES: { license: { name: string; url: string }; credits: string[]; note?: "notice" }[] = [
  {
    license: CDLA,
    credits: ["Meta", "Microsoft", "PinMeTo", "Krick", "RenderSEO", "DAC", "BrightQuery", "Birdeye", "Uberall", "OpenTravel Alliance"].map((s) => `Data from ${s}.`),
  },
  {
    license: { name: "Apache License 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
    credits: ["Copyright 2024 Foursquare Labs, Inc. All rights reserved."],
    note: "notice",
  },
  {
    license: { name: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
    credits: ["Data from AllThePlaces."],
  },
];

/** "2026-10-21.0" -> "October 21, 2026". */
const releaseDate = (release: string) => {
  const m = release.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return release;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
};

export default async function DataSourcesPage() {
  const release = dbConfigured() ? await overtureRelease().catch(() => null) : null;
  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-16 sm:py-24">
          <h1 className="text-5xl sm:text-6xl">Data sources</h1>
          <p className="mt-5 max-w-xl text-xl text-mist">Where our business listings come from, and how to take one out.</p>
        </div>
      </section>
      <section className="bg-white py-16 sm:py-20">
        <div className="container-page max-w-3xl space-y-12 text-lg">
          <div>
            <h2 className="text-3xl">Public business listings</h2>
            <p className="mt-4">
              Business listings include data from the{" "}
              <a href="https://overturemaps.org" rel="noopener noreferrer" className="text-royal underline">Overture Maps Foundation, overturemaps.org</a>
              {release ? <>, release of {releaseDate(release)} ({release})</> : ""}.
            </p>
            <p className="mt-4 text-navy-soft">Overture&rsquo;s places data combines these sources, under these licenses:</p>
            <ul className="mt-4 space-y-4">
              {SOURCES.map((s) => (
                <li key={s.license.name} className="rounded-2xl p-5 ring-1 ring-line">
                  <a href={s.license.url} rel="noopener noreferrer" className="font-semibold text-royal underline">{s.license.name}</a>
                  <ul className="mt-2 grid gap-x-6 gap-y-1 text-base sm:grid-cols-2">
                    {s.credits.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                  {s.note === "notice" && (
                    <p className="mt-2 text-base text-navy-soft">
                      This data was transformed to the Overture schema. See{" "}
                      <a href={OVERTURE_NOTICE_URL} rel="noopener noreferrer" className="underline">NOTICE.txt</a>.
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-base text-navy-soft">
              Businesses that add or claim their own listing provide those details themselves. They are not part of the Overture data.
            </p>
          </div>

          <div>
            <h2 className="text-3xl">How we use it</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>Anyone can see counts of businesses by category and distance. Names are not shown publicly.</li>
              <li>A business owner who claims their listing sees the names of the businesses that fit theirs.</li>
              <li>A listing is never shown as a member until its owner joins.</li>
              <li>We don&rsquo;t publish a directory, and listings are not indexed by search engines.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-cloud p-6">
            <h2 className="text-2xl">Want a business removed?</h2>
            <p className="mt-2">We&rsquo;ll take it out and keep it out of future updates.</p>
            <Link href="/remove-my-business" className="mt-5 inline-flex rounded-xl bg-royal px-5 py-3 font-semibold text-white hover:bg-navy">
              Remove my business
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
