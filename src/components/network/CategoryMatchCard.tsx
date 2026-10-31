import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { CategoryResult } from "@/lib/network/search";
import { CategoryIcon } from "./CategoryIcon";

const nearest = (mi: number) => (mi < 1 ? "Under a mile" : `About ${Math.round(mi)} mi`);

/** Anonymous result: a category, a live count, distance, and why it fits. Never business names. */
export function CategoryMatchCard({ r, radiusMiles, claimHref }: { r: CategoryResult; radiusMiles: number; claimHref: string }) {
  const idea = r.ideas.find((i) => i.primary);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line">
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ice text-royal">
          <CategoryIcon id={r.category.id} />
        </span>
        <h3 className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-4xl font-bold tracking-tight tabular-nums">{r.count.toLocaleString("en-US")}</span>
          <span className="text-base font-semibold">{r.category.plural}</span>
        </h3>
        <p className="text-lg font-medium leading-snug">{r.reason}</p>
        <ul className="mt-auto flex flex-wrap gap-2 text-sm" aria-label="Details">
          {idea && <li className="rounded-full bg-navy px-3 py-1.5 font-semibold text-white">{idea.label}</li>}
          <li className="inline-flex items-center gap-1 rounded-full bg-cloud px-3 py-1.5 ring-1 ring-line">
            <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
            <span>
              Nearest: {nearest(r.nearestMiles)}
              <span className="sr-only"> · counted within {radiusMiles} miles</span>
            </span>
          </li>
        </ul>
      </div>
      <Link
        href={claimHref}
        className="flex h-14 items-center justify-between border-t border-line px-5 font-semibold text-royal hover:bg-ice sm:px-6"
      >
        See who they are <ArrowRight aria-hidden="true" className="h-5 w-5" />
      </Link>
    </article>
  );
}
