import Link from "next/link";
import type { ReactNode } from "react";
import { stateLabels } from "@/content/network";
import type { OwnedPlace } from "@/lib/members/network";
import { signOutMember } from "@/app/(site)/sign-in/actions";
import { billingFor, membershipLive } from "@/lib/payments/billing";
import { paymentsConfigured } from "@/lib/payments/plans";
import { acceptedVersion, currentAgreement, partnerFor, upcomingAgreement } from "@/lib/planner/partners";

const tabs = [
  { href: "/dashboard", label: "Matches" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/partnerships", label: "Partnerships" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/plans", label: "Plans" },
];

export async function DashboardShell({
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
  // A live membership shows beside the business's status. Never used for matching or ranking.
  const member = paymentsConfigured() ? membershipLive((await billingFor(place.id).catch(() => null))?.membership ?? null) : false;
  // Planner Partners: shown on their own dashboard only. Never used for matching or ranking.
  const partner = await partnerFor(place.id);
  const isPartner = Boolean(partner?.active);
  const accepted = isPartner ? await acceptedVersion(place.id).catch(() => null) : null;
  const agreement = currentAgreement();
  const upcoming = isPartner ? upcomingAgreement() : null;
  const needsAcceptance = isPartner && accepted?.version !== agreement.version;
  const shown = isPartner ? [...tabs, { href: "/dashboard/vendors", label: "Invite vendors" }] : tabs;
  const until = partner ? new Date(`${partner.ends_on}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "";
  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="container-page pt-8 sm:pt-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-3xl sm:text-4xl">{place.name}</h1>
              <p className="mt-1 text-navy-soft">
                {place.category_label} · <span className="font-semibold text-navy">{stateLabels[place.state]}</span>
                {member && <> · <span className="rounded-full bg-ice px-2 py-0.5 text-sm font-semibold text-navy">Member</span></>}
              </p>
              {isPartner && (
                <p className="mt-2 inline-flex rounded-full bg-ice px-3 py-1 text-sm font-semibold text-navy">Planner Partner · member until {until}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {places.length > 1 && (
                <form method="get" className="flex items-center gap-2">
                  <label htmlFor="place-switch" className="sr-only">Business</label>
                  <select id="place-switch" name="place" defaultValue={place.id} className="rounded-lg border border-field bg-white px-3 py-2 text-sm">
                    {places.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button type="submit" className="rounded-lg px-3 py-2 text-sm font-semibold text-navy ring-1 ring-line">Switch</button>
                </form>
              )}
              <form action={signOutMember}>
                <button type="submit" className="text-sm font-semibold text-navy-soft hover:underline">Sign out</button>
              </form>
            </div>
          </div>
          <nav aria-label="Dashboard" className="-mx-4 mt-6 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
            <div className="inline-flex gap-1 rounded-full bg-cloud p-1 ring-1 ring-line">
              {shown.map((t) => (
                <Link
                  key={t.href}
                  href={t.href + q}
                  aria-current={active === t.href ? "page" : undefined}
                  className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[15px] font-semibold text-navy hover:bg-white aria-[current=page]:bg-navy aria-[current=page]:text-white"
                >
                  {t.label}
                  {t.href === "/dashboard/requests" && incoming > 0 && (
                    <span className="rounded-full bg-navy px-2 py-0.5 text-xs text-white">
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
        <div className="container-page py-10 sm:py-12">
          {(needsAcceptance || upcoming) && (
            <div className="mb-6 rounded-2xl bg-white p-5 ring-1 ring-line">
              {needsAcceptance ? (
                <p>
                  Please review and accept the <strong>Planner Partner Agreement (version {agreement.version})</strong>.{" "}
                  <Link href={`/dashboard/vendors?place=${place.id}#agreement`} className="font-semibold text-navy underline underline-offset-2">Review and accept</Link>
                </p>
              ) : upcoming ? (
                <p>
                  The Planner Partner Agreement changes on {upcoming.effective}.{" "}
                  <Link href={`/planner-partners/agreement/v${upcoming.version}`} className="font-semibold text-navy underline underline-offset-2">Read version {upcoming.version}</Link>
                </p>
              ) : null}
            </div>
          )}
          {children}
        </div>
      </section>
    </>
  );
}
