import Link from "next/link";
import type { ReactNode } from "react";
import { stateLabels } from "@/content/network";
import type { OwnedPlace } from "@/lib/members/network";
import { signOutMember } from "@/app/(site)/sign-in/actions";

const tabs = [
  { href: "/dashboard", label: "Matches" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/partnerships", label: "Partnerships" },
  { href: "/dashboard/profile", label: "Profile" },
];

export function DashboardShell({
  active,
  place,
  places,
  incoming,
  children,
}: {
  active: string;
  place: OwnedPlace;
  places: OwnedPlace[];
  incoming: number;
  children: ReactNode;
}) {
  const q = places.length > 1 ? `?place=${place.id}` : "";
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="container-page pt-8 sm:pt-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-3xl sm:text-4xl">{place.name}</h1>
              <p className="mt-1 text-navy-soft">
                {place.category_label} · <span className="font-semibold text-navy">{stateLabels[place.state]}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {places.length > 1 && (
                <form method="get" className="flex items-center gap-2">
                  <label htmlFor="place-switch" className="sr-only">Business</label>
                  <select id="place-switch" name="place" defaultValue={place.id} className="rounded-lg border border-field bg-white px-3 py-2 text-sm">
                    {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button type="submit" className="rounded-lg px-3 py-2 text-sm font-semibold text-royal ring-1 ring-line">Switch</button>
                </form>
              )}
              <form action={signOutMember}>
                <button type="submit" className="text-sm font-semibold text-navy-soft hover:text-royal">Sign out</button>
              </form>
            </div>
          </div>
          <nav aria-label="Dashboard" className="-mx-4 mt-6 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
            <div className="inline-flex gap-1 rounded-full bg-cloud p-1 ring-1 ring-line">
              {tabs.map((t) => (
                <Link
                  key={t.href}
                  href={t.href + q}
                  aria-current={active === t.href ? "page" : undefined}
                  className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[15px] font-semibold text-navy hover:bg-white aria-[current=page]:bg-navy aria-[current=page]:text-white"
                >
                  {t.label}
                  {t.href === "/dashboard/requests" && incoming > 0 && (
                    <span className="rounded-full bg-royal px-2 py-0.5 text-xs text-white">
                      <span className="sr-only">(</span>{incoming}<span className="sr-only"> new)</span>
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </section>
      <section className="bg-cloud">
        <div className="container-page py-10 sm:py-12">{children}</div>
      </section>
    </>
  );
}
