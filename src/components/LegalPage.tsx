import type { ReactNode } from "react";

/** Shared layout for the Privacy Policy and Terms of Use: title, then version and dates where a page shows them, then the text. */
export function LegalPage({
  title,
  version,
  effective,
  updated,
  children,
}: {
  title: string;
  version?: string;
  effective?: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <h1 className="text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-navy-soft">
        {version && <>Version {version} · </>}
        {effective && <>Effective {effective} · </>}
        Last updated {updated}
      </p>
      <div className="prose-site mt-8 text-navy">{children}</div>
    </div>
  );
}
