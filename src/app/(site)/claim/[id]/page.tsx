import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Globe, MapPin, Phone } from "lucide-react";
import { formatPhone } from "@/content/network";
import { CategoryIcon } from "@/components/network/CategoryIcon";
import { Field, Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { dbConfigured } from "@/lib/db";
import { getClaimable } from "@/lib/members/claims";
import { websiteDomain } from "@/lib/members/domains";
import { claimPlace } from "../actions";

// Business pages exist only for the person claiming them; never indexed.
export const metadata: Metadata = { title: "Claim your business", robots: { index: false, follow: false } };

const errors: Record<string, string> = {
  email: "Enter a valid email address.",
  limit: "Too many claim attempts. Please try again in an hour.",
  owned: "Someone has already claimed this business.",
};

export default async function ClaimPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const id = Number((await params).id);
  const { error } = await searchParams;
  if (!Number.isInteger(id) || !dbConfigured()) notFound();
  const place = await getClaimable(id);
  if (!place) notFound();
  const domain = websiteDomain(place.website);

  return (
    <section className="bg-cloud">
      <div className="container-page max-w-2xl py-12 sm:py-20">
        <Link href="/claim" className="text-sm font-semibold text-royal hover:underline">Back to search</Link>
        <h1 className="mt-4 text-4xl">Is this your business?</h1>

        <div className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-line">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ice text-royal">
              <CategoryIcon id={place.category_id ?? ""} />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl">{place.name}</h2>
              <p className="text-navy-soft">{place.category_label}</p>
            </div>
          </div>
          <ul className="mt-5 space-y-2 text-navy-soft">
            {(place.street || place.locality) && (
              <li className="flex gap-2"><MapPin aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                {[place.street, place.locality, [place.region, place.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</li>
            )}
            {place.phone && <li className="flex gap-2"><Phone aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />{formatPhone(place.phone)}</li>}
            {place.website && <li className="flex gap-2 break-all"><Globe aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />{place.website}</li>}
          </ul>
          <p className="mt-5 text-xs text-navy-soft">
            From public business listings. <Link href="/data-sources" className="underline">Data sources</Link> ·{" "}
            <Link href={`/remove-my-business?place=${place.id}`} className="underline">Remove this business</Link>
          </p>
        </div>

        {place.owned ? (
          <div className="mt-6">
            <Notice tone="info">
              This business has already been claimed. If that&rsquo;s a mistake, <Link href="/contact" className="font-semibold text-royal underline">let us know</Link>.
            </Notice>
          </div>
        ) : (
          <form action={claimPlace} className="mt-6 space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
            {error && errors[error] && <Notice>{errors[error]}</Notice>}
            <input type="hidden" name="place_id" value={place.id} />
            <Field
              label="Your work email"
              name="email"
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              placeholder={domain ? `you@${domain}` : "you@yourbusiness.com"}
              hint={
                domain
                  ? <>Use an address at <strong>{domain}</strong> to verify instantly. Any other address goes to a quick review.</>
                  : "We'll review your claim by hand and email you."
              }
            />
            <Field label="Anything that helps us confirm it's yours" name="note" textarea optional maxLength={500} rows={2}
                   placeholder="Your role, or a link to your Instagram" />
            <SubmitButton pendingLabel="Sending…" className="w-full sm:w-auto">Email me a link</SubmitButton>
            <p className="text-sm text-navy-soft">Free to claim your business and see your matches.</p>
          </form>
        )}
      </div>
    </section>
  );
}
