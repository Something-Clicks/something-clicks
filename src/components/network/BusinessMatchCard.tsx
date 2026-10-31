import { MapPin } from "lucide-react";
import { partnershipLabels, reasonText, type PartnershipType } from "@/content/journeys";
import { formatMiles, stateLabels, type PlaceState } from "@/content/network";
import { CategoryIcon } from "./CategoryIcon";

export type BusinessMatch = {
  placeB: number;
  name: string;
  categoryId: string;
  categoryLabel: string;
  journeyId: string;
  state: PlaceState;
  locality: string;
  distanceM: number;
  reasonKey: string;
  rationale: string | null;
  partnershipType: PartnershipType;
};

const badge: Record<PlaceState, string> = {
  listed: "bg-cloud text-navy-soft ring-1 ring-line",
  claimed: "bg-ice text-navy ring-1 ring-royal/40",
  verified: "bg-ice text-navy ring-1 ring-royal",
  member: "bg-navy text-white",
};

/**
 * Signed-in view of one match. Shows the business name and its real state:
 * an imported business is always "Not on Something Clicks yet", never implied to be a member.
 */
export function BusinessMatchCard({ m, action }: { m: BusinessMatch; action: React.ReactNode }) {
  return (
    <article className="flex h-full flex-col rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ice text-royal">
          <CategoryIcon id={m.categoryId} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-xl" title={m.name}>{m.name}</h3>
          <p className="text-sm text-navy-soft">{m.categoryLabel}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded-full px-2.5 py-0.5 font-semibold ${badge[m.state]}`}>{stateLabels[m.state]}</span>
        <span className="inline-flex items-center gap-1 text-navy-soft">
          <MapPin aria-hidden="true" className="h-4 w-4" />
          {m.locality ? `${m.locality} · ` : ""}{formatMiles(m.distanceM)}
        </span>
      </div>
      <p className="mt-4 text-lg font-medium">{m.rationale || reasonText(m.journeyId, m.reasonKey)}</p>
      <p className="mt-3"><span className="inline-block rounded-full bg-cloud px-3 py-1 text-sm font-semibold ring-1 ring-line">{partnershipLabels[m.partnershipType]}</span></p>
      <div className="mt-auto pt-6">{action}</div>
    </article>
  );
}
