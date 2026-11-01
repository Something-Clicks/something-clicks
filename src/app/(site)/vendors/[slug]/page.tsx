import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { InquiryForm } from "@/components/couples/InquiryForm";
import { VendorCard } from "@/components/couples/VendorCard";
import { metroBySlug } from "@/content/metros";
import { BUDGETS, couplesOpen, priceText } from "@/lib/couples/config";
import { publicProfile, recordView, resolveSource, worksWellWith } from "@/lib/couples/directory";
import { validLink } from "@/lib/members/network";
import { pageMeta } from "@/lib/metadata";

// Rendered per request: the page counts views, and stays off until COUPLES_OPEN=true.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ via?: string; src?: string; date?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!couplesOpen()) return {};
  const v = await publicProfile((await params).slug).catch(() => null);
  if (!v) return {};
  return pageMeta({
    title: `${v.name}, ${v.category_label.toLowerCase()}`,
    path: `/vendors/${v.slug}`,
    description: (v.about || v.description).slice(0, 155) || `${v.name} on Something Clicks.`,
  });
}

export default async function VendorPage({ params, searchParams }: Props) {
  if (!couplesOpen()) notFound();
  const { slug } = await params;
  const sp = await searchParams;
  const v = await publicProfile(slug).catch(() => null);
  if (!v) notFound();
  const [partners, source] = await Promise.all([worksWellWith(v.place_id), resolveSource(v.place_id, sp.via, sp.src)]);
  await recordView(v.place_id, source.source).catch((e) => console.error("[vendors] view not counted", e));
  const price = priceText(v.price_from, v.price_to);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : undefined;
  const partnerList = (heading: string) =>
    partners.length > 0 && (
      <section aria-labelledby={`partners-${heading.length}`} className="mt-6">
        <h2 id={`partners-${heading.length}`} className="text-xl font-semibold">{heading}</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partners.map((p) => <li key={p.place_id}><VendorCard v={p} via={v.slug} query={date ? `date=${date}` : ""} /></li>)}
        </ul>
      </section>
    );

  return (
    <>
      <section className="bg-white">
        <div className="container-page py-10 sm:py-14">
          <p className="text-sm text-navy-soft">
            {v.category_label}
            {v.locality && <> · {v.locality}{v.region && `, ${v.region}`}</>}
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{v.name}</h1>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-navy-soft">
            {price && <span className="font-semibold text-navy">{price}</span>}
            {v.markets.length > 0 && <span>Serves {v.markets.map((m) => metroBySlug(m)?.name ?? m).join(", ")}</span>}
            {v.website && validLink(v.website) && (
              <a href={v.website} rel="noopener nofollow" target="_blank" className="inline-flex items-center gap-1 font-semibold text-navy underline underline-offset-2">
                Website <ExternalLink aria-hidden="true" className="h-4 w-4" /><span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
          </div>
          {v.photos.length > 0 && (
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {v.photos.map((ph, i) => (
                <li key={ph.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ph.url} alt={ph.alt} className="h-full w-full rounded-2xl object-cover" loading={i < 3 ? "eager" : "lazy"} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="bg-cloud">
        <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_28rem]">
          <div>
            {v.about && (
              <>
                <h2 className="text-2xl">About</h2>
                <p className="mt-3 whitespace-pre-line text-lg">{v.about}</p>
              </>
            )}
            {v.styles.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Styles">
                {v.styles.map((s) => <li key={s} className="rounded-full bg-white px-3 py-1 text-sm ring-1 ring-line">{s}</li>)}
              </ul>
            )}
            {partnerList(`Works well with`)}
            {partners.length > 0 && (
              <p className="mt-3 text-sm text-navy-soft">Businesses {v.name} has a partnership with on Something Clicks.</p>
            )}
          </div>
          <div>
            <InquiryForm
              slug={v.slug}
              vendorName={v.name}
              via={sp.via}
              src={sp.src}
              date={date}
              budgets={BUDGETS}
              after={
                partners.length > 0 && (
                  <div className="mt-6">
                    <p className="font-semibold">{v.name} also works with</p>
                    <ul className="mt-2 space-y-1">
                      {partners.map((p) => (
                        <li key={p.place_id}>
                          <Link href={`/vendors/${p.slug}?via=${v.slug}`} className="text-navy underline underline-offset-2">{p.name}</Link>
                          <span className="text-sm text-navy-soft"> · {p.category_label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }
            />
            <p className="mt-3 text-sm text-navy-soft">Your details go only to {v.name}.</p>
          </div>
        </div>
      </section>
    </>
  );
}
