import type { Metadata } from "next";
import { PageHeader } from "@/components/site-chrome";
import { codeFromSearchParams } from "@/lib/attribution";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = { title: "Request a commercial cleaning walkthrough" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // The referral cookie is set by middleware and read again by the server action on submit.
  const urlCode = codeFromSearchParams(await searchParams);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title="Tell us what your business needs."
        intro={
          <p>
            Request a commercial cleaning walkthrough. It&apos;s free and there&apos;s no obligation. Your details are
            shared with one cleaning company, and only after you agree below.
          </p>
        }
      />
      <div className="card">
        <BookingForm urlCode={urlCode} />
      </div>
    </div>
  );
}
