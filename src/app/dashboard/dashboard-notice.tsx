"use client";

import { useEffect, useRef } from "react";

/**
 * Result of an action that redirected back to the dashboard (e.g. checkout). Announced to screen
 * readers and focused once when it appears.
 */
export function DashboardNotice({ tone, children }: { tone: "ok" | "warn"; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div
      ref={ref}
      role={tone === "ok" ? "status" : "alert"}
      tabIndex={-1}
      className={`mb-6 rounded-md border p-4 text-sm ${tone === "ok" ? "border-brand-100 bg-brand-50 text-brand-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}
    >
      {children}
    </div>
  );
}
