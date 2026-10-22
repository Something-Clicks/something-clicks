import { CLEANING_FREQUENCIES, PROPERTY_TYPES } from "@/lib/constants";
import { formatDateTime, labelFor } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Request = {
  id: string;
  business_name: string;
  contact_name: string;
  contact_title: string | null;
  email: string;
  phone: string;
  address_line1: string;
  city: string;
  zip: string;
  property_type: string;
  approx_sq_ft: number | null;
  cleaning_frequency: string;
  is_decision_maker: boolean;
  current_contract_end: string | null;
  preferred_times: string | null;
  notes: string | null;
  referral_code: string | null;
  source: string;
  status: string;
  consent_at: string | null;
  consent_text_version: string | null;
  duplicate_of: string | null;
  created_at: string;
};

export default async function RequestsPage() {
  const { data } = await supabaseAdmin()
    .from("referrals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as Request[];

  return (
    <div>
      <h1 className="text-2xl font-bold">Booking requests</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Businesses that asked for a walkthrough. Automatic matching to buyers isn&apos;t built yet, so requests wait here
        with status &quot;waiting_for_match&quot; — follow up within one business day.
      </p>
      <div className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.id} className="card text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.business_name}</p>
                <p className="text-zinc-600">
                  {r.contact_name}
                  {r.contact_title ? `, ${r.contact_title}` : ""} · {r.email} · {r.phone}
                </p>
                <p className="text-zinc-600">
                  {r.address_line1}, {r.city} {r.zip}
                </p>
              </div>
              <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-semibold uppercase">{r.status}</span>
            </div>
            <p className="mt-3">
              {labelFor(PROPERTY_TYPES, r.property_type)} · {r.approx_sq_ft?.toLocaleString() ?? "?"} sq ft ·{" "}
              {labelFor(CLEANING_FREQUENCIES, r.cleaning_frequency)} · decision maker: {r.is_decision_maker ? "yes" : "no"}
              {r.current_contract_end ? ` · contract ends ${r.current_contract_end}` : ""}
            </p>
            {r.preferred_times ? <p>Preferred times: {r.preferred_times}</p> : null}
            {r.notes ? <p className="whitespace-pre-wrap">Notes: {r.notes}</p> : null}
            <p className="mt-2 text-xs text-zinc-500">
              {formatDateTime(r.created_at)} · source {r.source}
              {r.referral_code ? ` · code ${r.referral_code}` : ""} · consent {r.consent_text_version ?? "none"} at{" "}
              {formatDateTime(r.consent_at)}
              {r.duplicate_of ? ` · duplicate of ${r.duplicate_of}` : ""}
            </p>
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-zinc-600">No requests yet.</p> : null}
      </div>
    </div>
  );
}
