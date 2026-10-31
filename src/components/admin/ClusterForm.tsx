"use client";

import { useActionState } from "react";
import { saveClusterAction, type ClusterFormState } from "@/app/admin/(protected)/network/actions";
import type { ClusterRow } from "@/lib/network/admin";

const input = "mt-1 block w-full rounded-lg border border-field bg-white px-3 py-2 text-sm";

export function ClusterForm({ cluster, journeys }: { cluster?: ClusterRow | null; journeys: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveClusterAction, {} as ClusterFormState);
  const field = (name: keyof ClusterRow, label: string, opts: { step?: string; hint?: string; def?: string | number } = {}) => (
    <div>
      <label htmlFor={name} className="text-sm font-medium">{label}</label>
      <input id={name} name={name} required type={opts.step ? "number" : "text"} step={opts.step}
             defaultValue={(cluster?.[name] as string | number | undefined) ?? opts.def} className={input} />
      {opts.hint && <p className="mt-1 text-xs text-navy-soft">{opts.hint}</p>}
    </div>
  );
  return (
    <form action={action} className="space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line">
      {cluster && <input type="hidden" name="id" value={cluster.id} />}
      {state.error && <p role="alert" className="rounded-lg bg-[#fdecea] p-3 text-sm text-danger">{state.error}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        {field("name", "Name", { hint: "e.g. Salt Lake Valley weddings" })}
        {field("slug", "Slug", { hint: "Used by the import command, e.g. slv-weddings" })}
        <div>
          <label htmlFor="journey_id" className="text-sm font-medium">Journey</label>
          <select id="journey_id" name="journey_id" defaultValue={cluster?.journey_id ?? journeys[0]?.id} className={input}>
            {journeys.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="scope" className="text-sm font-medium">Scope</label>
          <select id="scope" name="scope" defaultValue={cluster?.scope ?? "metro"} className={input}>
            <option value="metro">Metro: matches generated here</option>
            <option value="national">National: import scope only</option>
          </select>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input id="include_broad" name="include_broad" type="checkbox" defaultChecked={cluster?.include_broad ?? true} className="h-4 w-4 accent-royal" />
          <label htmlFor="include_broad" className="text-sm">Import broad categories (salons, bakeries, jewelers, gift shops)</label>
        </div>
        <div className="flex items-end gap-2 pb-2 sm:col-span-2">
          <input id="match_unconfirmed_broad" name="match_unconfirmed_broad" type="checkbox" defaultChecked={cluster?.match_unconfirmed_broad ?? false} className="h-4 w-4 accent-royal" />
          <label htmlFor="match_unconfirmed_broad" className="text-sm">
            Also match broad businesses not yet confirmed to serve weddings (off: only those marked &ldquo;yes&rdquo; are matched)
          </label>
        </div>
        <div>
          <label htmlFor="status" className="text-sm font-medium">Status</label>
          <select id="status" name="status" defaultValue={cluster?.status ?? "draft"} className={input}>
            {["draft", "importing", "active", "paused"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Bounding box (decimal degrees)</legend>
        <div className="mt-2 grid gap-5 sm:grid-cols-4">
          {field("min_lng", "West (min longitude)", { step: "any" })}
          {field("min_lat", "South (min latitude)", { step: "any" })}
          {field("max_lng", "East (max longitude)", { step: "any" })}
          {field("max_lat", "North (max latitude)", { step: "any" })}
        </div>
      </fieldset>
      <div className="grid gap-5 sm:grid-cols-3">
        {field("distance_scale_km", "Distance scale (km)", { step: "any", def: 10, hint: "Matches this far apart score about 37% on distance" })}
        {field("max_match_km", "Maximum match distance (km)", { step: "any", def: 40 })}
        {field("min_confidence", "Minimum Overture confidence", { step: "0.05", def: 0.6 })}
      </div>
      <button type="submit" disabled={pending} className="rounded-lg bg-navy px-5 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save cluster"}
      </button>
    </form>
  );
}
