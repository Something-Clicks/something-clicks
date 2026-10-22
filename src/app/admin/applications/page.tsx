import { rejectApplication } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { PARTNER_TYPES } from "@/lib/constants";
import { formatDateTime, labelFor } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Application = {
  id: string;
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  partner_type: string;
  referral_plan: string;
  terms_version: string;
  status: string;
  review_note: string | null;
  created_at: string;
};

export default async function ApplicationsPage() {
  const { data } = await supabaseAdmin()
    .from("partner_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const apps = (data ?? []) as Application[];

  return (
    <div>
      <h1 className="text-2xl font-bold">Partner applications</h1>
      <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
        Approving a partner creates their PromoteKit affiliate account and referral link. That step is not built yet
        (it waits on PromoteKit API access being verified), so approval is not available here. You can review and reject
        applications now; pending ones stay queued for approval.
      </div>
      <div className="mt-6 space-y-4">
        {apps.map((a) => (
          <div key={a.id} className="card text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {a.full_name} · {a.business_name}
                </p>
                <p className="text-zinc-600">
                  {labelFor(PARTNER_TYPES, a.partner_type)} · {a.email} · {a.phone}
                </p>
                <p className="text-xs text-zinc-500">
                  Applied {formatDateTime(a.created_at)} · terms {a.terms_version}
                </p>
              </div>
              <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-semibold uppercase">{a.status}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap">{a.referral_plan}</p>
            {a.review_note ? <p className="mt-2 text-zinc-600">Note: {a.review_note}</p> : null}
            {a.status === "pending" ? (
              <form action={rejectApplication} className="mt-4 flex flex-wrap items-end gap-2">
                <input type="hidden" name="application_id" value={a.id} />
                <label className="flex-1">
                  Internal note (optional)
                  <input name="note" className="input mt-1" />
                </label>
                <SubmitButton className="btn-danger">Reject</SubmitButton>
              </form>
            ) : null}
          </div>
        ))}
        {!apps.length ? <p className="text-sm text-zinc-600">No applications yet.</p> : null}
      </div>
    </div>
  );
}
