"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Last line of defence on public pages: a friendly message, never a stack trace. */
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="bg-cloud py-20 sm:py-28">
      <div role="alert" className="container-page max-w-lg text-center">
        <h1 className="text-4xl">We&rsquo;ll be right back.</h1>
        <p className="mt-3 text-lg text-navy-soft">This part of Something Clicks isn&rsquo;t ready yet, or something went wrong on our side.</p>
        <p className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => retry()} className="rounded-xl bg-royal px-5 py-3 font-semibold text-white hover:bg-[#1f45e0]">
            Try again
          </button>
          <Link href="/" className="rounded-xl bg-white px-5 py-3 font-semibold text-royal ring-1 ring-inset ring-royal hover:bg-ice">
            Back to the homepage
          </Link>
        </p>
      </div>
    </section>
  );
}
