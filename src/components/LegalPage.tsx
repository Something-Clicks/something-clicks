import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <div role="note" className="flex gap-3 rounded-xl bg-[#fff4d6] p-4 text-navy ring-1 ring-[#e0b44a]">
        <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm">
          <strong>Draft, pending legal review.</strong> This placeholder text has not been reviewed by an attorney and
          must be finalized before launch.
        </p>
      </div>
      <h1 className="mt-8 text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-navy-soft">Last updated: {updated}</p>
      <div className="prose-site mt-8 text-navy">{children}</div>
    </div>
  );
}
