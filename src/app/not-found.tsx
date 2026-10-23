import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 text-zinc-600">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/book" className="btn !py-3">
          Request a walkthrough
        </Link>
        <Link href="/cleaning-companies" className="btn-secondary !py-3">
          For cleaning companies
        </Link>
      </div>
      <p className="mt-6">
        <Link href="/" className="font-medium text-brand-700 underline underline-offset-4">
          Go to the homepage
        </Link>
      </p>
    </div>
  );
}
