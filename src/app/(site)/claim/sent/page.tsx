import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { DevLink } from "@/components/members/DevLink";
import { P } from "@/components/Placeholder";
import { site } from "@/content/site";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default async function ClaimSentPage({ searchParams }: { searchParams: Promise<{ m?: string; dev?: string }> }) {
  const { m, dev } = await searchParams;
  return (
    <section className="bg-cloud">
      <div className="container-page max-w-lg py-16 text-center sm:py-24">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-royal ring-1 ring-line">
          <Mail aria-hidden="true" className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-4xl">Check your email.</h1>
        {m === "email_domain" ? (
          <p className="mt-3 text-lg text-navy-soft">Open the link we sent. Your business is verified the moment you do.</p>
        ) : (
          <p className="mt-3 text-lg text-navy-soft">
            Open the link we sent to confirm your email. Then we review your claim and email you, <P value={site.responseWindow} />.
          </p>
        )}
        <DevLink email={dev} />
      </div>
    </section>
  );
}
