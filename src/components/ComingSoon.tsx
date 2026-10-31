import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Friendly placeholder while a feature's data or setup isn't live yet. Never an error. */
export function ComingSoon({
  title = "Coming soon.",
  body = "We're loading wedding businesses now. Check back shortly.",
  compact = false,
}: {
  title?: string;
  body?: string;
  compact?: boolean;
}) {
  const inner = (
    <div role="status" className="mx-auto max-w-lg text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-white text-royal ring-1 ring-line">
        <Sparkles aria-hidden="true" className="h-8 w-8" />
      </span>
      <h2 className="mt-6 text-4xl">{title}</h2>
      <p className="mt-3 text-lg text-navy-soft">{body}</p>
      <p className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-xl bg-navy px-5 py-3 font-semibold text-white hover:bg-navy/90">Back to the homepage</Link>
        <Link href="/contact" className="rounded-xl bg-white px-5 py-3 font-semibold text-navy ring-1 ring-inset ring-navy hover:bg-ice">Contact us</Link>
      </p>
    </div>
  );
  return compact ? inner : <section className="bg-cloud py-20 sm:py-28"><div className="container-page">{inner}</div></section>;
}
