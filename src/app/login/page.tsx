import type { Metadata } from "next";
import { SignInForm } from "@/app/auth/auth-forms";
import { NotConfigured, PageHeader } from "@/components/site-chrome";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  not_buyer: "This area is for cleaning company accounts.",
  callback: "That sign-in link is invalid or has expired. Please sign in again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader title="Sign in" />
      {error && ERRORS[error] ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{ERRORS[error]}</div>
      ) : null}
      {!isSupabaseConfigured() ? (
        <div className="mb-4">
          <NotConfigured what="Signing in" />
        </div>
      ) : null}
      <div className="card">
        <SignInForm next={safeNext} />
      </div>
    </div>
  );
}
