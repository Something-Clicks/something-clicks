import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessMatchCard } from "@/components/network/BusinessMatchCard";
import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import type { PartnershipType } from "@/content/journeys";
import type { PlaceState } from "@/content/network";
import { dbConfigured } from "@/lib/db";
import { getPlace, placeMatches } from "@/lib/network/admin";

/** Admin-only preview of the signed-in match view for any business, before member accounts exist. */
export default async function MatchPreviewPage({ searchParams }: { searchParams: Promise<{ place?: string }> }) {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const id = Number((await searchParams).place);
  if (!Number.isInteger(id)) notFound();
  const [place, matches] = await Promise.all([getPlace(id), placeMatches(id)]);
  if (!place) notFound();
  const visible = matches.filter((m) => m.status !== "hidden");
  return (
    <>
      <NetworkNav active="/admin/network/explorer" />
      <p className="text-sm text-navy-soft">
        Preview: what {place.name} would see after claiming.{" "}
        <Link href={`/admin/network/explorer?place=${id}`} className="font-semibold text-royal hover:underline">Back to explorer</Link>
      </p>
      <h1 className="mt-2 text-3xl">Your matches</h1>
      <p className="mt-1 text-navy-soft">{visible.length} businesses near {place.locality || "you"} that fit a {place.category_label.toLowerCase()}.</p>
      <ul className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((m) => (
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
              action={
                <button type="button" disabled className="w-full rounded-xl bg-royal px-4 py-3 font-semibold text-white opacity-90">
                  {m.state === "member" ? "Request an introduction" : "Invite them"}
                </button>
              }
            />
          </li>
        ))}
      </ul>
    </>
  );
}
