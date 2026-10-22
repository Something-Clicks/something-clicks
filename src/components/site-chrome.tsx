import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-brand-900">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG logo */}
          <img src="/logo.svg" alt="" width={28} height={34} className="h-8 w-auto" />
          Something Clicks
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-700">
          <Link href="/book" className="hover:text-brand-700">
            Request a walkthrough
          </Link>
          <Link href="/partners" className="hover:text-brand-700">
            Referral partners
          </Link>
          <Link href="/cleaning-companies" className="hover:text-brand-700">
            Cleaning companies
          </Link>
          <Link href="/login" className="btn-secondary !py-1.5">
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-4 px-4 py-8 text-sm text-zinc-600">
        <p>© {new Date().getFullYear()} Something Clicks · Salt Lake Valley, Utah</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/terms/buyer" className="hover:underline">
            Buyer terms
          </Link>
          <Link href="/terms/partner" className="hover:underline">
            Partner terms
          </Link>
          <Link href="/privacy" className="hover:underline">
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
