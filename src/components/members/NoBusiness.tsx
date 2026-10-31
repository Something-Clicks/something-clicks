import Link from "next/link";
import { Clock } from "lucide-react";
import { P } from "@/components/Placeholder";
import { site } from "@/content/site";
import type { PendingClaim } from "@/lib/members/network";
import { signOutMember } from "@/app/(site)/sign-in/actions";

/** Signed in, but no verified business yet: either a claim under review, or nothing claimed. */
export function NoBusiness({ email, pending }: { email: string; pending: PendingClaim[] }) {
  return (
    <section className="bg-cloud">
      <div className="container-page max-w-2xl py-16 sm:py-24">
        {pending.length ? (
          <>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-royal ring-1 ring-line">
              <Clock aria-hidden="true" className="h-7 w-7" />
            </span>
            <h1 className="mt-6 text-4xl">We&rsquo;re reviewing your claim.</h1>
            <ul className="mt-4 space-y-1 text-lg">
              {pending.map((c) => <li key={c.id}><strong>{c.name}</strong></li>)}
            </ul>
            <p className="mt-4 text-lg text-navy-soft">
              We&rsquo;ll email {email}, <P value={site.responseWindow} />. Your matches appear here once it&rsquo;s approved.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-4xl">Claim your business.</h1>
            <p className="mt-3 text-lg text-navy-soft">You&rsquo;re signed in as {email}. Find your business to see your matches.</p>
            <Link href="/claim" className="mt-8 inline-flex rounded-xl bg-royal px-6 py-3 font-semibold text-white hover:bg-navy">
              Find my business
            </Link>
          </>
        )}
        <form action={signOutMember} className="mt-10">
          <button type="submit" className="text-sm font-semibold text-navy-soft hover:text-royal">Sign out</button>
        </form>
      </div>
    </section>
  );
}
