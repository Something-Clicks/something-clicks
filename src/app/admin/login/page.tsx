import { redirect } from "next/navigation";
import { devLoginEnabled, getAdmin } from "@/lib/admin-auth";
import { devLogin } from "../actions";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 ring-1 ring-line">
        <p className="eyebrow">Something Clicks</p>
        <h1 className="mt-2 text-2xl">Admin sign-in</h1>
        <p className="mt-2 text-sm text-navy-soft">We&rsquo;ll email a one-time sign-in link to the administrator address.</p>
        {error === "link" && (
          <p role="alert" className="mt-4 rounded-lg bg-[#fdecea] p-3 text-sm text-danger">
            That link was invalid or expired. Request a new one.
          </p>
        )}
        <LoginForm />
        {devLoginEnabled() && (
          <form action={devLogin} className="mt-6 border-t border-line pt-6">
            <button type="submit" className="w-full rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white">
              Dev sign-in (local only)
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
