import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { kindMeta, kinds } from "@/lib/admin-fields";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
      <header className="bg-navy text-white on-dark">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <nav aria-label="Admin" className="flex flex-wrap items-center gap-1 text-sm">
            <Link href="/admin" className="mr-3 font-semibold text-white">
              Something Clicks · Admin
            </Link>
            <Link href="/admin/network" className="rounded-md px-3 py-1.5 text-mist hover:bg-white/10 hover:text-white">
              Network
            </Link>
            <Link href="/admin/setup" className="rounded-md px-3 py-1.5 text-mist hover:bg-white/10 hover:text-white">
              Setup
            </Link>
            {kinds.map((k) => (
              <Link key={k} href={`/admin/${k}`} className="rounded-md px-3 py-1.5 text-mist hover:bg-white/10 hover:text-white">
                {kindMeta[k].title}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-mist">{admin}</span>
            <form action={signOut}>
              <button type="submit" className="rounded-md px-3 py-1.5 text-white ring-1 ring-white/30 hover:bg-white/10">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
