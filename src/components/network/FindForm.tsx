import { Search } from "lucide-react";
import { WhatField } from "./WhatField";

/** The central action. A plain GET form, so results have a shareable URL and work without JavaScript. */
export function FindForm({
  what = "",
  where = "",
  id = "find",
  compact = false,
}: {
  what?: string;
  where?: string;
  id?: string;
  compact?: boolean;
}) {
  const field = "min-w-0 flex-1 px-5 py-2.5 sm:px-7";
  const input =
    "mt-0.5 block w-full border-0 bg-transparent p-0 text-navy placeholder:text-navy-soft/70 focus:ring-0 focus-visible:outline-none";
  return (
    <div className="w-full">
      <form
        id={id}
        action="/matches"
        method="get"
        role="search"
        aria-label="Find your business matches"
        className={`scroll-mt-24 flex flex-col text-left gap-1 rounded-3xl bg-white p-2 shadow-[0_6px_30px_rgba(1,19,53,0.12)] ring-1 ring-line has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-royal sm:flex-row sm:items-center sm:rounded-full ${compact ? "" : "sm:p-2.5"}`}
      >
        <div className={`${field} border-line sm:border-r`}>
          <label htmlFor={`${id}-what`} className="block text-xs font-semibold text-navy">
            What you do
          </label>
          <WhatField id={`${id}-what`} defaultValue={what} className={`${input} ${compact ? "text-base" : "text-lg"}`} />
        </div>
        <div className={`${field} border-t border-line sm:border-t-0`}>
          <label htmlFor={`${id}-where`} className="block text-xs font-semibold text-navy">
            Where
          </label>
          <input
            id={`${id}-where`}
            name="where"
            required
            defaultValue={where}
            autoComplete="address-level2"
            maxLength={80}
            placeholder="City, state or ZIP"
            className={`${input} ${compact ? "text-base" : "text-lg"}`}
          />
        </div>
        <button
          type="submit"
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-navy font-semibold text-white hover:bg-navy/90 sm:rounded-full ${compact ? "h-12 px-6" : "h-14 px-7 text-lg"}`}
        >
          <Search aria-hidden="true" className="h-5 w-5" strokeWidth={2.4} />
          Find your partners
        </button>
      </form>
    </div>
  );
}
