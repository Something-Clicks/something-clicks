import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import { DashboardShell } from "@/components/members/DashboardShell";
import { NoBusiness } from "@/components/members/NoBusiness";
import { Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { formatPhone } from "@/content/network";
import { sourceLabels, statusLabels, STATUSES } from "@/lib/couples/config";
import { inquiriesFor, type InquiryRow } from "@/lib/couples/inquiries";
import { loadDashboard } from "@/lib/members/dashboard";
import { readiness } from "@/lib/readiness";
import { inquiryStatusAction } from "../couples-actions";

export const metadata: Metadata = { title: "Inquiries", robots: { index: false } };

type Search = { place?: string; done?: string; error?: string };

const day = (d: Date | string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default async function InquiriesPage({ searchParams }: { searchParams: Promise<Search> }) {
  // The layout shows "coming soon" until accounts are live; don't query tables that may not exist yet.
  if (!(await readiness()).members) return null;
  const sp = await searchParams;
  const ctx = await loadDashboard("/dashboard/inquiries", sp.place);
  if (ctx.kind === "none") return <NoBusiness email={ctx.member.email} pending={ctx.pending} />;
  const rows = await inquiriesFor(ctx.member, ctx.place.id).catch(() => [] as InquiryRow[]);
  return (
    <DashboardShell active="/dashboard/inquiries" place={ctx.place} places={ctx.places} incoming={ctx.incoming}>
      {sp.error && <Notice>{sp.error}</Notice>}
      {sp.done === "status" && <Notice tone="success">Updated.</Notice>}
      <h2 className="text-2xl">Inquiries from couples</h2>
      <p className="mt-1 text-navy-soft">Only you see these. Reply by email, then mark where each one stands.</p>
      {rows.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white p-6 text-navy-soft ring-1 ring-line">
          No inquiries yet. When you show your profile to couples (Profile → For couples), their inquiries arrive here and by email.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((q) => (
            <li key={q.id} className="rounded-2xl bg-white p-5 ring-1 ring-line sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{q.name}</p>
                  <p className="text-sm text-navy-soft">
                    {day(q.created_at)} · {sourceLabels[q.source]}
                    {q.via_name && <> ({q.via_name})</>}
                  </p>
                </div>
                <span className="rounded-full bg-cloud px-3 py-1 text-sm font-semibold ring-1 ring-line">{statusLabels[q.status]}</span>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {q.wedding_date && <Item label="Wedding date" value={day(q.wedding_date)} />}
                {q.location && <Item label="City or venue" value={q.location} />}
                {q.guest_count != null && <Item label="Guests" value={String(q.guest_count)} />}
                {q.budget && <Item label="Budget" value={q.budget} />}
              </dl>
              <p className="mt-4 whitespace-pre-line">{q.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <a href={`mailto:${q.email}`} className="inline-flex items-center gap-1.5 font-semibold text-navy underline underline-offset-2">
                  <Mail aria-hidden="true" className="h-4 w-4" />{q.email}
                </a>
                {q.phone && (
                  <a href={`tel:${q.phone}`} className="inline-flex items-center gap-1.5 font-semibold text-navy underline underline-offset-2">
                    <Phone aria-hidden="true" className="h-4 w-4" />{formatPhone(q.phone)}
                  </a>
                )}
              </div>
              <form action={inquiryStatusAction} className="mt-4 flex flex-wrap items-center gap-2">
                <input type="hidden" name="place_id" value={ctx.place.id} />
                <input type="hidden" name="inquiry_id" value={q.id} />
                <label htmlFor={`status-${q.id}`} className="text-sm font-medium">Status</label>
                <select id={`status-${q.id}`} name="status" defaultValue={q.status} className="rounded-lg border border-field bg-white px-3 py-2 text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
                <SubmitButton variant="secondary" pendingLabel="Saving…" className="px-4 py-2 text-sm">Update</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline font-medium">{label}: </dt>
      <dd className="inline text-navy-soft">{value}</dd>
    </div>
  );
}
