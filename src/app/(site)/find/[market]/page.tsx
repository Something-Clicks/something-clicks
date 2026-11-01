import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VendorCard } from "@/components/couples/VendorCard";
import { inputClass } from "@/components/members/fields";
import { activeJourneys, categoryById } from "@/content/journeys";
import { metroBySlug } from "@/content/metros";
import { BUDGET_FILTERS, couplesOpen } from "@/lib/couples/config";
import { browseVendors } from "@/lib/couples/directory";
import { pageMeta } from "@/lib/metadata";

// Rendered per request (filters live in the query string). Off until COUPLES_OPEN=true.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ market: string }>; searchParams: Promise<{ category?: string; budget?: string; date?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = metroBySlug((await params).market);
  if (!couplesOpen() || !m) return {};
  return pageMeta({
    title: `Wedding vendors in ${m.name}`,
    path: `/find/${m.slug}`,
    description: `Find wedding vendors in ${m.name}, and see who they work well with. Send an inquiry for free.`,
  });
}

export default async function FindPage({ params, searchParams }: Props) {
  if (!couplesOpen()) notFound();
  const m = metroBySlug((await params).market);
  if (!m) notFound();
  const sp = await searchParams;
  const categories = (activeJourneys()[0]?.categories ?? []).filter((c) => !c.broad);
  const category = sp.category && categoryById(sp.category) && !categoryById(sp.category)?.broad ? sp.category : null;
  const budget = BUDGET_FILTERS.find((b) => b.value === sp.budget)?.value ?? "";
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : "";
  const vendors = await browseVendors({ market: m.slug, category, budgetMax: budget ? Number(budget) : null }).catch(() => []);

  return (
    <>
      <section className="bg-white">
        <div className="container-page py-10 sm:py-14">
          <h1 className="max-w-3xl text-4xl sm:text-5xl">Find wedding vendors in {m.name}</h1>
          <p className="mt-3 max-w-2xl text-lg text-navy-soft">
            See each vendor&rsquo;s work, prices and the other vendors they work well with. Sending an inquiry is free.
          </p>
          <form method="get" className="mt-8 grid gap-4 rounded-2xl bg-cloud p-4 ring-1 ring-line sm:grid-cols-4 sm:items-end">
            <div>
              <label htmlFor="f-category" className="block text-sm font-medium">Category</label>
              <select id="f-category" name="category" defaultValue={category ?? ""} className={inputClass}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-budget" className="block text-sm font-medium">Budget</label>
              <select id="f-budget" name="budget" defaultValue={budget} className={inputClass}>
                <option value="">Any budget</option>
                {BUDGET_FILTERS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-date" className="block text-sm font-medium">Wedding date <span className="font-normal text-navy-soft">(optional)</span></label>
              <input id="f-date" name="date" type="date" defaultValue={date} className={inputClass} />
            </div>
            <button type="submit" className="h-[46px] rounded-xl bg-navy px-5 font-semibold text-white hover:bg-navy/90">Show vendors</button>
          </form>
        </div>
      </section>
      <section className="bg-cloud">
        <div className="container-page py-10 sm:py-12">
          {vendors.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">No vendors match these filters yet. Try another category or budget.</p>
          ) : (
            <>
              <p className="text-sm text-navy-soft">
                {vendors.length} {vendors.length === 1 ? "vendor" : "vendors"}. Shown in a rotating order; no vendor pays to appear higher.
                {date && " Ask each vendor about your date when you send an inquiry."}
              </p>
              <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {vendors.map((v) => <li key={v.place_id}><VendorCard v={v} query={date ? `date=${date}` : ""} /></li>)}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  );
}
