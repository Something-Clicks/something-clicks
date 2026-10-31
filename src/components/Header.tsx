import Link from "next/link";
import { CircleUserRound } from "lucide-react";
import { Logo } from "./Logo";

/** Compact header: the logo and account access. Everything else lives in the footer. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          <Link href="/claim" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-navy hover:bg-cloud sm:block">
            Claim your business
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center gap-2 rounded-full pl-4 pr-1.5 text-sm font-semibold text-navy ring-1 ring-line hover:shadow-[0_2px_10px_rgba(1,19,53,0.10)]"
          >
            Sign in
            <CircleUserRound aria-hidden="true" className="h-8 w-8 text-navy" strokeWidth={1.5} />
          </Link>
        </nav>
      </div>
    </header>
  );
}
