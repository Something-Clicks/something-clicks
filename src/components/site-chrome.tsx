import Link from "next/link";
import { MobileMenu } from "./mobile-menu";
import { NAV_LINKS, PRIMARY_ACTION } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="relative border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight text-brand-900">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
          <img src="/logo.svg" alt="" width={28} height={34} className="h-8 w-auto" />
          Something Clicks
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 whitespace-nowrap text-sm font-medium text-zinc-700 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2.5 hover:bg-zinc-50 hover:text-brand-700">
              {l.label}
            </Link>
          ))}
          <Link href={PRIMARY_ACTION.href} className="btn ml-2 !py-2.5">
            {PRIMARY_ACTION.label}
          </Link>
        </nav>
        <MobileMenu />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-zinc-600">
        <p>© {new Date().getFullYear()} Something Clicks · Salt Lake Valley, Utah</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-4">
          <Link href="/partners" className="inline-block py-1.5 hover:underline">
            Referral partners
          </Link>
          <Link href="/terms/buyer" className="inline-block py-1.5 hover:underline">
            Buyer terms
          </Link>
          <Link href="/terms/partner" className="inline-block py-1.5 hover:underline">
            Partner terms
          </Link>
          <Link href="/privacy" className="inline-block py-1.5 hover:underline">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function PageHeader({ title, intro }: { title: string; intro?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{title}</h1>
      {intro ? <div className="mt-3 max-w-3xl text-zinc-600">{intro}</div> : null}
    </div>
  );
}

export function NotConfigured({ what }: { what: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      {what} is not available yet: the site&apos;s database connection has not been configured.
    </div>
  );
}
