"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleUserRound } from "lucide-react";

/**
 * "Sign in", or "Your dashboard" once we know a member is signed in. Checked
 * in the browser so every public page can stay static and cached.
 */
export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    fetch("/api/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s: { signedIn?: boolean } | null) => setSignedIn(Boolean(s?.signedIn)))
      .catch(() => {});
  }, []);
  return (
    <Link
      href={signedIn ? "/dashboard" : "/sign-in"}
      className="inline-flex h-11 items-center gap-2 rounded-full pl-4 pr-1.5 text-sm font-semibold text-navy ring-1 ring-line hover:shadow-[0_2px_10px_rgba(1,19,53,0.10)]"
    >
      {signedIn ? "Your dashboard" : "Sign in"}
      <CircleUserRound aria-hidden="true" className="h-8 w-8 text-navy" strokeWidth={1.5} />
    </Link>
  );
}
