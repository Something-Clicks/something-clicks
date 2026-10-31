import type { Metadata } from "next";
import Link from "next/link";
import { SubmitButton } from "@/components/members/SubmitButton";
import { adminConfig } from "@/lib/admin-auth";
import { readUnsubscribeToken } from "@/lib/invitations";
import { readiness } from "@/lib/readiness";
import { unsubscribeAction } from "./actions";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };

const mask = (email: string) => email.replace(/^(.)[^@]*(@.*)$/, "$1•••$2");

/** Unsubscribing takes effect immediately; the button guards against link scanners unsubscribing people by accident. */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string; error?: string }> }) {
  // The layout shows "coming soon" until the database and signing secret are set.
  const ready = await readiness();
  if (!ready.db || !ready.secret) return null;
  const sp = await searchParams;
  const email = sp.t ? await readUnsubscribeToken(sp.t, adminConfig().secret) : null;
  return (
    <section className="bg-cloud">
      <div className="container-page max-w-lg py-20 text-center sm:py-28">
        {sp.done ? (
          <>
            <h1 className="text-4xl">You&rsquo;re unsubscribed.</h1>
            <p className="mt-4 text-lg text-navy-soft">We won&rsquo;t email you again. It takes effect now.</p>
          </>
        ) : email ? (
          <>
            <h1 className="text-4xl">Unsubscribe?</h1>
            <p className="mt-4 text-lg text-navy-soft">We&rsquo;ll stop emailing {mask(email)}.</p>
            <form action={unsubscribeAction} className="mt-8">
              <input type="hidden" name="t" value={sp.t} />
              <SubmitButton pendingLabel="One moment…">Unsubscribe</SubmitButton>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-4xl">That link didn&rsquo;t work.</h1>
            <p className="mt-4 text-lg text-navy-soft">
              Use the link in the email again, or <Link href="/contact" className="font-semibold text-navy underline">contact us</Link> and
              we&rsquo;ll take you off our list.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
