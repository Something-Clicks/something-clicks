import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/site-chrome";
import { attributionWindowDays, codeFromSearchParams, resolveAttribution } from "@/lib/attribution";
import { ATTRIBUTION_COOKIE } from "@/lib/constants";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "Request a commercial cleaning walkthrough" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const urlCode = codeFromSearchParams(await searchParams);
  const cookieStore = await cookies();
  const { code } = resolveAttribution({
    urlCode,
    cookieValue: cookieStore.get(ATTRIBUTION_COOKIE)?.value,
    now: new Date(),
    windowDays: attributionWindowDays(),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title="Request a commercial cleaning walkthrough"
        intro={
          <>
            <p>
              Tell us about your space. We&apos;ll match you with one vetted commercial cleaning company that serves
              your part of the Salt Lake Valley, and they&apos;ll walk through and give you a quote. It&apos;s free, and
              you&apos;re never obligated to hire them.
            </p>
            {code ? (
              <p className="mt-3 text-sm font-medium text-brand-700">You were referred by one of our partners.</p>
            ) : null}
          </>
        }
      />
      <div className="card">
        <BookingForm urlCode={urlCode} />
      </div>
    </div>
  );
}
