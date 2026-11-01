import Link from "next/link";
import { CategoryIcon } from "@/components/network/CategoryIcon";
import { priceText } from "@/lib/couples/config";
import type { VendorCard as Card } from "@/lib/couples/directory";

/** A public vendor in a list. `via` marks a link from another vendor's "Works well with". */
export function VendorCard({ v, via, query = "" }: { v: Card; via?: string; query?: string }) {
  const params = new URLSearchParams(query);
  if (via) params.set("via", via);
  const qs = params.toString();
  const price = priceText(v.price_from, v.price_to);
  return (
    <Link href={`/vendors/${v.slug}${qs ? `?${qs}` : ""}`} className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line hover:ring-navy">
      {v.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={v.photo} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />
      ) : (
        <span className="grid aspect-[4/3] w-full place-items-center bg-cloud text-royal">
          {v.category_id && <CategoryIcon id={v.category_id} />}
        </span>
      )}
      <span className="flex flex-1 flex-col gap-1 p-5">
        <span className="text-lg font-semibold group-hover:underline">{v.name}</span>
        <span className="text-sm text-navy-soft">
          {v.category_label}
          {v.locality && <> · {v.locality}</>}
        </span>
        {price && <span className="text-sm font-semibold">{price}</span>}
        {v.styles.length > 0 && <span className="text-sm text-navy-soft">{v.styles.slice(0, 3).join(" · ")}</span>}
      </span>
    </Link>
  );
}
