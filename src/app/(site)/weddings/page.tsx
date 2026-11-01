import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { metros } from "@/content/metros";
import { formatAtLeast } from "@/content/network";
import { dbConfigured } from "@/lib/db";
import { breadcrumbJsonLd, JsonLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/metadata";
import { metroTotals } from "@/lib/network/metros";

// Rendered on request, never at build: data comes from the hourly cache in lib/network/metros.
export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Wedding businesses by city",
  path: "/weddings",
  description: "Something Clicks is live for wedding businesses in Dallas–Fort Worth, Atlanta, Houston, Phoenix and Nashville.",
});

export default async function WeddingsIndexPage() {
  const totals = dbConfigured() ? await metroTotals().catch(() => ({}) as Record<string, number>) : {};
  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-20 sm:py-28">
          <h1 className="max-w-3xl text-5xl leading-[1.05] sm:text-7xl">Live in five cities.</h1>
          <p className="mt-6 max-w-xl text-xl text-mist">Wedding businesses that fit together, city by city.</p>
        </div>
      </section>
      <section className="bg-white py-16 sm:py-24">
        <ul className="container-page grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metros.map((m) => (
            <li key={m.slug}>
              <Link href={`/weddings/${m.slug}`} className="group flex h-full flex-col rounded-2xl bg-cloud p-7 hover:bg-ice">
                <span className="text-sm text-navy-soft">{m.state}</span>
                <span className="mt-1 text-3xl font-semibold">{m.name}</span>
                {totals[m.cluster] ? (
                  <span className="mt-2 text-lg text-navy-soft">{formatAtLeast(totals[m.cluster])} wedding businesses</span>
                ) : null}
                <span className="mt-6 inline-flex items-center gap-1 font-semibold text-navy">
                  See who&rsquo;s there <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Cities", path: "/weddings" }])} />
    </>
  );
}
