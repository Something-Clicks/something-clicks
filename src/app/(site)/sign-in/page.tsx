import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Field, Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { getMember, safeNext } from "@/lib/members/auth";
import { requestSignIn } from "./actions";
import { readiness } from "@/lib/readiness";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const errors: Record<string, string> = {
  email: "Enter a valid email address.",
  limit: "Too many sign-in links. Please try again in an hour.",
  link: "That link has expired or was already used. We can send a new one.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  // The layout shows "coming soon" until accounts are live; don't query tables that may not exist yet.
  if (!(await readiness()).members) return null;
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getMember()) redirect(next);
  return (
    <section className="bg-cloud">
      <div className="container-page max-w-lg py-16 sm:py-24">
        <h1 className="text-4xl">Sign in</h1>
        <p className="mt-3 text-lg text-navy-soft">We&rsquo;ll email you a link. No password needed.</p>
        <form action={requestSignIn} className="mt-8 space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
          {sp.error && errors[sp.error] && <Notice>{errors[sp.error]}</Notice>}
          <input type="hidden" name="next" value={next} />
          <Field label="Email" name="email" type="email" required autoComplete="email" maxLength={254} />
          <SubmitButton pendingLabel="Sending…" className="w-full">Email me a link</SubmitButton>
        </form>
        <p className="mt-6 text-navy-soft">
          New here? <Link href="/claim" className="font-semibold text-royal hover:underline">Claim your business</Link>
        </p>
      </div>
    </section>
  );
}
