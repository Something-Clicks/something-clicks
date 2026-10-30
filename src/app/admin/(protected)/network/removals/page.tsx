import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { formatDate } from "@/lib/admin-fields";
import { dbConfigured } from "@/lib/db";
import { listRemovals } from "@/lib/network/removals";
import { removalAction } from "../removal-actions";

export default async function RemovalsPage() {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const rows = await listRemovals();
  return (
    <>
      <NetworkNav active="/admin/network/removals" />
      <h1 className="text-3xl">Removal requests</h1>
      <p className="mt-2 max-w-3xl text-sm text-navy-soft">
        Requests made from an unclaimed listing&rsquo;s own page are hidden at once (marked done). The rest need you to find the
        listing: paste its ID from the match explorer and choose Remove. Remove also suppresses the listing&rsquo;s GERS ID, website
        domain and phone so imports skip it. Restore undoes that.
      </p>
      {rows.length === 0 && <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">No requests.</p>}
      <ul className="mt-6 space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl">{r.business_name}</h2>
              <span className="text-xs text-navy-soft">{formatDate(r.created_at.toISOString())} · <strong>{r.status}</strong></span>
            </div>
            <p className="text-sm text-navy-soft">{[r.city, r.website, r.contact_email].filter(Boolean).join(" · ")}</p>
            {r.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{r.notes}</p>}
            <p className="mt-2 text-sm">
              Listing: {r.place_id ? <>#{r.place_id} {r.place_name} ({r.place_state}{r.place_suppressed ? ", hidden" : ""})</> : "not linked"}
            </p>
            <form action={removalAction} className="mt-3 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={r.id} />
              {!r.place_id && (
                <>
                  <label htmlFor={`pid-${r.id}`} className="sr-only">Listing ID</label>
                  <input id={`pid-${r.id}`} name="place_id" inputMode="numeric" placeholder="Listing ID" className="w-32 rounded-lg border border-field px-3 py-2 text-sm" />
                </>
              )}
              <button name="decision" value="remove" className="rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white">Remove</button>
              <button name="decision" value="reject" className="rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-line">Reject</button>
              {r.place_suppressed && <button name="decision" value="restore" className="rounded-lg px-4 py-2 text-sm font-semibold text-danger ring-1 ring-line">Restore</button>}
            </form>
          </li>
        ))}
      </ul>
    </>
  );
}
