import Link from "next/link";
import { Field, Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { readiness } from "@/lib/readiness";
import { getClaimableByRef, isListingRef } from "@/lib/members/claims";
import { pageMeta } from "@/lib/metadata";
import { removeBusiness } from "./actions";

export const metadata = pageMeta({
  title: "Remove my business",
  path: "/remove-my-business",
  description: "Ask Something Clicks to remove a business listing and keep it out of future updates.",
});

const errors: Record<string, string> = {
  name: "Enter the business name.",
  email: "Enter a valid email address.",
  limit: "Too many requests. Please try again in an hour.",
};

export default async function RemovePage({ searchParams }: { searchParams: Promise<{ place?: string; error?: string }> }) {
  const sp = await searchParams;
  const ref = sp.place ?? "";
  const place = isListingRef(ref) && (await readiness()).members ? await getClaimableByRef(ref).catch(() => null) : null;
  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-16 sm:py-24">
          <h1 className="text-5xl sm:text-6xl">Remove a business.</h1>
          <p className="mt-5 max-w-xl text-xl text-mist">We&rsquo;ll take the listing out and keep it out of future updates.</p>
        </div>
      </section>
      <section className="bg-cloud py-14 sm:py-20">
        <div className="container-page max-w-2xl">
          <form action={removeBusiness} className="space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
            {sp.error && errors[sp.error] && <Notice>{errors[sp.error]}</Notice>}
            {place && (
              <>
                <input type="hidden" name="place_ref" value={ref} />
                <p className="rounded-xl bg-cloud p-4">
                  <strong>{place.name}</strong>
                  <span className="block text-sm text-navy-soft">{[place.street, place.locality, place.region].filter(Boolean).join(", ")}</span>
                </p>
              </>
            )}
            <Field label="Business name" name="business_name" required maxLength={200} defaultValue={place?.name} />
            <Field label="City" name="city" optional maxLength={120} defaultValue={place ? [place.locality, place.region].filter(Boolean).join(", ") : undefined} />
            <Field label="Website" name="website" optional maxLength={300} defaultValue={place?.website} />
            <Field label="Your email" name="contact_email" type="email" required maxLength={254} autoComplete="email"
                   hint="So we can confirm when it's done. We won't use it for anything else." />
            <Field label="Anything else" name="notes" textarea optional maxLength={1000} rows={2} />
            <SubmitButton pendingLabel="Sending…">Remove this business</SubmitButton>
          </form>
          <p className="mt-6 text-navy-soft">
            Own the business and want to keep it? <Link href="/claim" className="font-semibold text-navy underline">Claim it instead</Link> and
            control what&rsquo;s shown.
          </p>
        </div>
      </section>
    </>
  );
}
