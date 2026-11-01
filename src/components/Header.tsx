import Link from "next/link";
import { AccountLink } from "./AccountLink";
import { Logo } from "./Logo";

/** Compact header: the logo and account access. Everything else lives in the footer. */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          <Link href="/claim" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-navy hover:bg-cloud sm:block">
            Get started free
          </Link>
          <AccountLink />
        </nav>
      </div>
    </header>
  );
}
