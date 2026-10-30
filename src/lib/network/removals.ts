import { sql } from "@/lib/db";
import { websiteDomain } from "@/lib/members/domains";

/** The Overture release behind the current listings (latest successful load). */
export async function overtureRelease(): Promise<string | null> {
  const [run] = await sql()<{ release: string | null }[]>`
    select release from import_runs where status = 'succeeded' and mode = 'load' and release is not null
    order by finished_at desc limit 1`;
  return run?.release ?? null;
}

export type RemovalInput = { place_id: number | null; business_name: string; city: string; contact_email: string; website: string; notes: string };

/**
 * Records a removal request. A listing nobody has claimed is hidden at once;
 * claimed businesses (and requests we can't tie to a listing) wait for review.
 */
export async function requestRemoval(r: RemovalInput): Promise<{ hidden: boolean }> {
  return sql().begin(async (tx) => {
    let hidden = false;
    if (r.place_id) {
      const [p] = await tx<{ gers_id: string | null }[]>`
        update places set suppressed = true where id = ${r.place_id} and state = 'listed' and source = 'overture'
        returning gers_id`;
      if (p?.gers_id) {
        await tx`insert into suppression (kind, value, reason, note) values ('gers_id', ${p.gers_id}, 'removal', ${r.contact_email})
                 on conflict (kind, value) do nothing`;
        hidden = true;
      }
    }
    await tx`
      insert into removal_requests (place_id, business_name, city, contact_email, website, notes, status)
      values (${r.place_id}, ${r.business_name}, ${r.city}, ${r.contact_email}, ${r.website}, ${r.notes}, ${hidden ? "done" : "new"})`;
    return { hidden };
  });
}

export type RemovalRow = {
  id: number;
  place_id: number | null;
  business_name: string;
  city: string;
  contact_email: string;
  website: string;
  notes: string;
  status: string;
  created_at: Date;
  place_name: string | null;
  place_state: string | null;
  place_suppressed: boolean | null;
};

export async function listRemovals(): Promise<RemovalRow[]> {
  return sql()<RemovalRow[]>`
    select r.id::int, r.place_id::int, r.business_name, r.city, r.contact_email, r.website, r.notes, r.status, r.created_at,
           p.name as place_name, p.state::text as place_state, p.suppressed as place_suppressed
    from removal_requests r left join places p on p.id = r.place_id
    order by r.status = 'new' desc, r.created_at desc limit 200`;
}

/**
 * Admin decision. "remove" hides the listing and suppresses its GERS ID,
 * website domain and phone, so future imports skip it too; "restore" undoes that.
 */
export async function decideRemoval(id: number, decision: "remove" | "reject" | "restore", placeId: number | null) {
  await sql().begin(async (tx) => {
    const [r] = await tx<{ place_id: number | null; contact_email: string }[]>`
      select place_id::int, contact_email from removal_requests where id = ${id} for update`;
    if (!r) return;
    const pid = placeId ?? r.place_id;
    if (pid && pid !== r.place_id) await tx`update removal_requests set place_id = ${pid} where id = ${id}`;
    const [p] = pid ? await tx<{ gers_id: string | null; website: string; phone: string }[]>`
      select gers_id, website, phone from places where id = ${pid}` : [];
    const keys = p ? ([["gers_id", p.gers_id], ["domain", websiteDomain(p.website)], ["phone", p.phone.replace(/[^\d+]/g, "")]] as const).filter(([, v]) => v) : [];
    if (decision === "remove") {
      if (pid) await tx`update places set suppressed = true where id = ${pid}`;
      for (const [kind, value] of keys) {
        await tx`insert into suppression (kind, value, reason, note) values (${kind}, ${value!}, 'removal', ${r.contact_email})
                 on conflict (kind, value) do nothing`;
      }
      await tx`update removal_requests set status = 'done' where id = ${id}`;
    } else if (decision === "restore") {
      if (pid) await tx`update places set suppressed = false where id = ${pid}`;
      for (const [kind, value] of keys) await tx`delete from suppression where kind = ${kind} and value = ${value!} and reason = 'removal'`;
      await tx`update removal_requests set status = 'rejected' where id = ${id}`;
    } else {
      await tx`update removal_requests set status = 'rejected' where id = ${id}`;
    }
  });
}
