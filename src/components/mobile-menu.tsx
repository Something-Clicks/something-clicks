"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { NAV_LINKS, PRIMARY_ACTION } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();

  // Close after navigating, and on Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-300 text-zinc-800 hover:bg-zinc-50"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open ? (
        <nav id={menuId} aria-label="Main" className="absolute inset-x-0 top-full z-20 border-b border-zinc-200 bg-white shadow-sm">
          <ul className="mx-auto max-w-6xl px-4 py-2">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-base font-medium text-zinc-800">
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="py-3">
              <Link href={PRIMARY_ACTION.href} onClick={() => setOpen(false)} className="btn w-full !py-3 !text-base">
                {PRIMARY_ACTION.label}
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
