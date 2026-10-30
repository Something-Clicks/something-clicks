import Link from "next/link";
import { P } from "@/components/Placeholder";
import { placeholder } from "@/content/site";
import { dbConfigured } from "@/lib/db";
import { pageMeta } from "@/lib/metadata";
import { dataSources } from "@/lib/network/removals";

export const metadata = pageMeta({
  title: "Data sources",
  path: "/data-sources",
  description: "Where Something Clicks business listings come from, their licenses, and how to remove a business.",
});

// Reflects the latest import; refresh daily.
export const revalidate = 86400;

/** Licenses we have confirmed. Anything else is shown with a visible marker until legal review fills it in. */
const LICENSES: Record<string, { label: string; license: string; url: string }> = {
  Foursquare: { label: "Foursquare Open Source Places", license: "Apache License 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
  meta: { label: "Meta", license: "", url: "" },
  AllThePlaces: { label: "All the Places", license: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
};

export default async function DataSourcesPage() {
  const { release, datasets } = dbConfigured() ? await dataSources().catch(() => ({ release: null, datasets: [] })) : { release: null, datasets: [] };
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
              <a href="https://overturemaps.org" rel="noopener noreferrer" className="text-royal underline">Overture Maps Foundation</a>
              {release ? <>, release {release},</> : ""} made available under the{" "}
              <a href="https://cdla.dev/permissive-2-0/" rel="noopener noreferrer" className="text-royal underline">
                Community Data License Agreement – Permissive 2.0
              </a>.
            </p>
            {datasets.length > 0 && (
              <>
                <p className="mt-4 text-navy-soft">Overture combines these underlying sources:</p>
                <ul className="mt-3 divide-y divide-line rounded-2xl ring-1 ring-line">
                  {datasets.map((d) => {
                    const known = LICENSES[d]?.license ? LICENSES[d] : undefined;
                    return (
                      <li key={d} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                        <span className="font-medium">{LICENSES[d]?.label ?? d}</span>
                        <span className="text-navy-soft">
                          {known ? (
                            <a href={known.url} rel="noopener noreferrer" className="underline">{known.license}</a>
                          ) : (
                            <P value={placeholder("[Legal review: confirm license]")} />
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
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
            <Link href="/remove-my-business" className="mt-5 inline-flex rounded-xl bg-royal px-5 py-3 font-semibold text-white hover:bg-[#1f45e0]">
              Remove my business
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
