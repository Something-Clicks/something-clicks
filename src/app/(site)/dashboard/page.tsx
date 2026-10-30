import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { BusinessMatchCard } from "@/components/network/BusinessMatchCard";
import { DashboardShell } from "@/components/members/DashboardShell";
import { NoBusiness } from "@/components/members/NoBusiness";
import { Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import type { PartnershipType } from "@/content/journeys";
import type { PlaceState } from "@/content/network";
import { loadDashboard } from "@/lib/members/dashboard";
import { myMatches, type MyMatch } from "@/lib/members/network";
import { requestIntroAction } from "./actions";
import { readiness } from "@/lib/readiness";

export const metadata: Metadata = { title: "Your matches", robots: { index: false } };

type Search = { place?: string; done?: string; error?: string };

const done: Record<string, string> = {
  requested: "Introduction requested. We've let them know.",
  connected: "You're connected. Their contact details are under Requests.",
};

export default async function DashboardMatchesPage({ searchParams }: { searchParams: Promise<Search> }) {
  // The layout shows "coming soon" until accounts are live; don't query tables that may not exist yet.
  if (!(await readiness()).members) return null;
  const sp = await searchParams;
  const ctx = await loadDashboard("/dashboard", sp.place);
  if (ctx.kind === "none") return <NoBusiness email={ctx.member.email} pending={ctx.pending} />;
  const { place } = ctx;
  const matches = await myMatches(place.id);
  const canRequest = place.state === "member";

  return (
    <DashboardShell active="/dashboard" place={place} places={ctx.places} incoming={ctx.incoming}>
      <div className="space-y-4">
        {sp.error && <Notice>{sp.error}</Notice>}
        {sp.done && done[sp.done] && <Notice tone="success">{done[sp.done]}</Notice>}
        {!canRequest && (
          <div className="flex flex-col items-start gap-3 rounded-2xl bg-white p-5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
            <p><strong>Join the network</strong> to request introductions and let your matches find you.</p>
            <Link href={`/dashboard/profile?place=${place.id}`} className="shrink-0 rounded-xl bg-royal px-5 py-2.5 font-semibold text-white hover:bg-[#1f45e0]">
              Join the network
            </Link>
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 ring-1 ring-line">
          <h2 className="text-2xl">{place.in_metro ? "Your matches are on their way." : "Not in your area yet."}</h2>
          <p className="mt-2 text-lg text-navy-soft">
            {place.in_metro
              ? "We refresh matches regularly. New businesses show up here as soon as they're ready."
              : "Matches are live in Dallas–Fort Worth, Atlanta, Houston, Phoenix and Nashville. Your business is saved, and your matches appear here when your area opens."}
          </p>
        </div>
      ) : (
        <>
          <h2 className="mt-8 text-2xl">{matches.length} businesses that fit yours</h2>
          <ul className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((m) => (
              <li key={m.place_b}>
                <BusinessMatchCard
                  m={{
                    placeB: m.place_b,
                    name: m.name,
                    categoryId: m.category_id,
                    categoryLabel: m.category_label,
                    journeyId: place.journey_id,
                    state: m.state as PlaceState,
                    locality: m.locality,
                    distanceM: m.distance_m,
                    reasonKey: m.reason_key,
                    rationale: m.ai_rationale,
                    partnershipType: m.partnership_type as PartnershipType,
                  }}
                  action={<MatchAction m={m} placeId={place.id} canRequest={canRequest} />}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardShell>
  );
}

function MatchAction({ m, placeId, canRequest }: { m: MyMatch; placeId: number; canRequest: boolean }) {
  const chip = "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold";
  if (m.intro_status === "connected") {
    return (
      <Link href={`/dashboard/requests?place=${placeId}`} className={`${chip} bg-ice text-royal hover:bg-[#dbe5ff]`}>
        <Check aria-hidden="true" className="h-5 w-5" /> Connected
      </Link>
    );
  }
  if (m.intro_status === "requested" && !m.intro_from_me) {
    return (
      <Link href={`/dashboard/requests?place=${placeId}`} className={`${chip} bg-royal text-white hover:bg-[#1f45e0]`}>
        They asked to connect
      </Link>
    );
  }
  if (m.intro_status === "requested") {
    return <p className={`${chip} bg-cloud text-navy-soft`}><Clock aria-hidden="true" className="h-5 w-5" /> Introduction requested</p>;
  }
  if (m.intro_status === "declined") return <p className={`${chip} bg-cloud text-navy-soft`}>Not right now</p>;
  if (m.state !== "member") {
    return <p className="text-sm text-navy-soft">You can connect once they join Something Clicks.</p>;
  }
  if (!canRequest) return <p className="text-sm text-navy-soft">Join the network to request an introduction.</p>;
  return (
    <form action={requestIntroAction} className="space-y-3">
      <input type="hidden" name="place_id" value={placeId} />
      <input type="hidden" name="to_place" value={m.place_b} />
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-royal">Add a note</summary>
        <label htmlFor={`note-${m.place_b}`} className="sr-only">Note to {m.name}</label>
        <input id={`note-${m.place_b}`} name="note" maxLength={200} placeholder="We share a lot of couples in Fort Worth."
               className="mt-2 block w-full rounded-lg border border-field px-3 py-2" />
      </details>
      <SubmitButton pendingLabel="Requesting…" className="w-full">Request an introduction</SubmitButton>
    </form>
  );
}
