import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { DevLink } from "@/components/members/DevLink";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ dev?: string }> }) {
  const { dev } = await searchParams;
  return (
    <section className="bg-cloud">
      <div className="container-page max-w-lg py-16 text-center sm:py-24">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-royal ring-1 ring-line">
          <Mail aria-hidden="true" className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-4xl">Check your email.</h1>
        <p className="mt-3 text-lg text-navy-soft">Open the link we sent to sign in. It works once and expires in an hour.</p>
        <DevLink email={dev} />
      </div>
    </section>
  );
}
