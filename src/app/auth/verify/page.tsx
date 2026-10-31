import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { SubmitButton } from "@/components/members/SubmitButton";
import { verifySignIn } from "@/app/(site)/sign-in/actions";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

/**
 * Sign-in link landing. The token is used only when the button is pressed,
 * because email security scanners open links on their own. Outside the site
 * layout, so analytics never sees the token in the URL.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-cloud px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center ring-1 ring-line">
        <div className="flex justify-center"><Logo /></div>
        <h1 className="mt-6 text-3xl">Welcome back.</h1>
        <form action={verifySignIn} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <SubmitButton pendingLabel="Signing in…" className="w-full">Continue to Something Clicks</SubmitButton>
        </form>
      </div>
    </main>
  );
}
