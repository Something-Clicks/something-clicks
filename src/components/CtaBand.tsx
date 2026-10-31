import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { site } from "@/content/site";

/** Closing band on content pages: every page leads to the one central action. */
export function CtaBand({ title = site.brandLine }: { title?: string }) {
  return (
    <section className="bg-navy text-white on-dark">
      <div className="container-page py-20 text-center sm:py-24">
        <h2 className="text-4xl sm:text-5xl">{title}</h2>
        <Link href="/#find" className="mt-10 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-4 text-lg font-semibold text-navy hover:bg-ice">
          Find your partners <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </Link>
        <p className="mt-4 text-sm text-mist">Free to claim your business and see your matches.</p>
      </div>
    </section>
  );
}
