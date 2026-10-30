import type { Metadata } from "next";
import { P } from "@/components/Placeholder";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Request received", robots: { index: false } };

export default async function RemoveThanksPage({ searchParams }: { searchParams: Promise<{ hidden?: string }> }) {
  const { hidden } = await searchParams;
  return (
    <section className="bg-cloud">
      <div className="container-page max-w-lg py-20 text-center sm:py-28">
        <h1 className="text-4xl">{hidden ? "It's removed." : "Got it."}</h1>
        <p className="mt-4 text-lg text-navy-soft">
          {hidden ? (
            "The listing is hidden now and won't come back in future updates."
          ) : (
            <>We&rsquo;ll find the listing, remove it, and email you <P value={site.responseWindow} />.</>
          )}
        </p>
      </div>
    </section>
  );
}
