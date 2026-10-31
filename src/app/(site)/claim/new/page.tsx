import type { Metadata } from "next";
import Link from "next/link";
import { Field, Notice, inputClass } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { matchVocabulary } from "@/content/journeys";
import { liveVocabulary } from "@/lib/network/vocabulary";
import { addBusiness } from "../actions";

export const metadata: Metadata = { title: "Add your business", robots: { index: false } };

const errors: Record<string, string> = {
  name: "Enter your business name.",
  category: "Choose what your business does.",
  other: "Tell us what your business does.",
  website: "Check the website address.",
  email: "Enter a valid email address.",
  where: "We couldn't find that place. Try a city and state, like Plano, TX, or a ZIP code.",
  limit: "Too many attempts. Please try again in an hour.",
  owned: "Someone has already claimed this business.",
};

type Search = Partial<Record<"error" | "name" | "category" | "other" | "what" | "website" | "where" | "service_area" | "note", string>>;

export default async function AddBusinessPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const vocab = await liveVocabulary();
  const categories = [...vocab].sort((a, b) => a.label.localeCompare(b.label));
  // Arriving from a search: preselect what they searched for, or "Something else" with their words.
  const searched = sp.what?.trim() ?? "";
  const match = searched ? matchVocabulary(searched, vocab, 1)[0] : undefined;
  const category = sp.category ?? (searched ? (match?.id ?? "other") : "");
  const other = sp.other ?? (searched && !match ? searched : "");
  return (
    <section className="bg-cloud">
      <div className="container-page max-w-2xl py-12 sm:py-20">
        <Link href="/claim" className="text-sm font-semibold text-navy hover:underline">Back to search</Link>
        <h1 className="mt-4 text-4xl">Add your business.</h1>
        <p className="mt-3 text-lg text-navy-soft">Home-based and new businesses welcome.</p>
        <form action={addBusiness} className="mt-8 space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
          {sp.error && errors[sp.error] && <Notice>{errors[sp.error]}</Notice>}
          <Field label="Business name" name="name" required maxLength={120} autoComplete="organization" defaultValue={sp.name} />
          <div>
            <label htmlFor="f-category" className="block font-medium">What does your business do?</label>
            <select id="f-category" name="category" required defaultValue={category} className={inputClass}>
              <option value="" disabled>Choose one</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              <option value="other">Something else</option>
            </select>
          </div>
          <Field label="If something else, what do you do?" name="other" optional maxLength={80} placeholder="Wedding officiant" defaultValue={other}
                 hint="We'll match you as soon as we add businesses like yours." />
          <Field label="City or ZIP" name="where" required maxLength={80} autoComplete="address-level2" placeholder="Dallas, TX" defaultValue={sp.where}
                 hint="Where you're based. We use it to find businesses near you." />
          <Field label="Area you serve" name="service_area" optional maxLength={200} placeholder="Dallas–Fort Worth" defaultValue={sp.service_area} />
          <Field label="Website" name="website" optional maxLength={300} inputMode="url" placeholder="yourbusiness.com" defaultValue={sp.website} />
          <Field label="Your work email" name="email" type="email" required autoComplete="email" maxLength={254}
                 hint="An address at your website's domain verifies instantly. Any other address goes to a quick review." />
          <Field label="Anything that helps us confirm it's yours" name="note" textarea optional maxLength={500} rows={2}
                 placeholder="Your role, or a link to your Instagram" defaultValue={sp.note} />
          <SubmitButton pendingLabel="Sending…" className="w-full sm:w-auto">Email me a link</SubmitButton>
          <p className="text-sm text-navy-soft">Free to claim your business and see your matches.</p>
        </form>
      </div>
    </section>
  );
}
