import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CategoryResult } from "@/lib/network/search";
import { CategoryIcon } from "./CategoryIcon";

const nearest = (mi: number) => (mi < 1 ? "less than a mile away" : `about ${Math.round(mi)} mile${Math.round(mi) === 1 ? "" : "s"} away`);

/** Anonymous result: a category, a live count, distance, and why it fits. Never business names. */
export function CategoryMatchCard({ r, radiusMiles, claimHref }: { r: CategoryResult; radiusMiles: number; claimHref: string }) {
  return (
    <article className="flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-line">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ice text-royal">
          <CategoryIcon id={r.category.id} />
        </span>
        <div>
          <h3 className="text-xl">
            <span className="tabular-nums">{r.count.toLocaleString()}</span> {r.category.plural}
          </h3>
          <p className="text-sm text-navy-soft">
            Within {radiusMiles} miles · nearest {nearest(r.nearestMiles)}
          </p>
        </div>
      </div>
      <p className="mt-4 text-lg font-medium">{r.reason}</p>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-soft">What you could do together</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {r.ideas.map((i) => (
            <li
              key={i.type}
              className={`rounded-full px-3 py-1 text-sm ${i.primary ? "bg-royal text-white" : "bg-cloud text-navy ring-1 ring-line"}`}
            >
              {i.label}
            </li>
          ))}
        </ul>
      </div>
      <Link href={claimHref} className="mt-auto inline-flex items-center gap-1 pt-6 font-semibold text-royal hover:underline">
        See who they are <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </article>
  );
}
