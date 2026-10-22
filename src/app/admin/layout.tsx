import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/buyers", label: "Buyers" },
  { href: "/admin/packs", label: "Credit packs" },
  { href: "/admin/applications", label: "Partner applications" },
  { href: "/admin/requests", label: "Booking requests" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
        <nav className="flex flex-wrap gap-4 text-sm font-medium">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-zinc-700 hover:text-brand-700">
              {n.label}
            </Link>
          ))}
        </nav>
        <form action="/auth/signout" method="post">
          <button className="btn-secondary !py-1" type="submit">
            Sign out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
