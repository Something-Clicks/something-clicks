"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Admin pages fail while production setup is unfinished (missing migrations or data); point to the checklist. */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="max-w-xl rounded-2xl bg-white p-8 ring-1 ring-line">
      <h1 className="text-2xl">This page can&rsquo;t load yet.</h1>
      <p className="mt-2 text-navy-soft">
        Usually that means a database migration or data load hasn&rsquo;t run yet. The setup checklist shows what&rsquo;s missing and how to fix it.
      </p>
      <p className="mt-6 flex flex-wrap gap-3">
        <Link href="/admin/setup" className="rounded-lg bg-navy px-4 py-2 font-semibold text-white">Open the setup checklist</Link>
        <button type="button" onClick={() => retry()} className="rounded-lg px-4 py-2 font-semibold text-navy ring-1 ring-line">Try again</button>
      </p>
    </div>
  );
}
