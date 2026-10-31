import Link from "next/link";
import { AgreementText } from "@/components/AgreementText";
import type { AgreementVersion } from "@/content/agreements/planner-partner";

/** An agreement version as a page, with its version, effective date and permanent link. */
export function AgreementPage({ a, current }: { a: AgreementVersion; current: boolean }) {
  return (
    <div className="bg-white">
      <article className="container-page max-w-3xl py-12 sm:py-16">
        <p className="text-sm font-semibold text-navy-soft">
          Version {a.version} · effective {a.effective}
          {current ? " · current version" : <> · <Link href="/planner-partners/agreement" className="underline">see the current version</Link></>}
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{a.title}</h1>
        <div className="mt-6">
          <AgreementText a={a} />
        </div>
        <p className="mt-10 text-sm text-navy-soft">
          Permanent link to this version: <Link href={`/planner-partners/agreement/v${a.version}`} className="underline">/planner-partners/agreement/v{a.version}</Link>
        </p>
      </article>
    </div>
  );
}
