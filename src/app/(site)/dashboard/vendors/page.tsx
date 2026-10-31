import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/members/DashboardShell";
import { NoBusiness } from "@/components/members/NoBusiness";
import { Notice, inputClass } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { activeJourneys } from "@/content/journeys";
import { loadDashboard } from "@/lib/members/dashboard";
import { acceptedVersion, currentAgreement, invitesFrom, MAX_INVITES, partnerFor } from "@/lib/planner/partners";
import { readiness } from "@/lib/readiness";
import { acceptAgreementAction, inviteVendorsAction } from "../../planner-partners/actions";

export const metadata: Metadata = { title: "Invite your vendors", robots: { index: false } };

type Search = { place?: string; done?: string; error?: string };

const statusLabel: Record<string, string> = { new: "With our team", approved: "Invited", claimed: "Joined", declined: "Not now" };

export default async function VendorsPage({ searchParams }: { searchParams: Promise<Search> }) {
  if (!(await readiness()).members) return null;
  const sp = await searchParams;
  const ctx = await loadDashboard("/dashboard/vendors", sp.place);
  if (ctx.kind === "none") return <NoBusiness email={ctx.member.email} pending={ctx.pending} />;
  const { place } = ctx;
  const partner = await partnerFor(place.id);
  if (!partner?.active) {
    return (
      <DashboardShell active="/dashboard/vendors" place={place} places={ctx.places} incoming={ctx.incoming}>
        <div className="rounded-2xl bg-white p-8 ring-1 ring-line">
          <p className="text-lg">Inviting vendors is part of the Planner Partner program.</p>
          <Link href="/planner-partners" className="mt-4 inline-flex rounded-xl bg-navy px-5 py-3 font-semibold text-white hover:bg-navy/90">About Planner Partners</Link>
        </div>
      </DashboardShell>
    );
  }
  const [invites, accepted] = await Promise.all([invitesFrom(place.id), acceptedVersion(place.id)]);
  const agreement = currentAgreement();
  const room = MAX_INVITES - invites.length;
  const rows = Math.min(room, 5);
  const categories = activeJourneys().flatMap((j) => j.categories.filter((c) => !c.broad));
  const invited = sp.done?.startsWith("invited-") ? Number(sp.done.slice(8)) : null;

  return (
    <DashboardShell active="/dashboard/vendors" place={place} places={ctx.places} incoming={ctx.incoming}>
      <div className="space-y-4">
        {sp.error && <Notice>{sp.error}</Notice>}
        {sp.done === "accepted" && <Notice tone="success">Thanks. We&rsquo;ve emailed you a copy of the agreement.</Notice>}
        {invited !== null && invited > 0 && <Notice tone="success">Added {invited}. Our team will help them claim their business; nothing is emailed until we&rsquo;ve checked in.</Notice>}
      </div>

      {accepted?.version !== agreement.version && (
        <form id="agreement" action={acceptAgreementAction} className="mt-2 scroll-mt-24 space-y-3 rounded-2xl bg-white p-6 ring-1 ring-line">
          <input type="hidden" name="place_id" value={place.id} />
          <h2 className="text-xl">Planner Partner Agreement</h2>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="agree" required className="mt-1 h-5 w-5 shrink-0" />
            <span>
              I have read and agree to the{" "}
              <Link href={`/planner-partners/agreement/v${agreement.version}`} target="_blank" className="font-semibold text-navy underline underline-offset-2">Planner Partner Agreement</Link>{" "}
              (version {agreement.version}).
            </span>
          </label>
          <SubmitButton pendingLabel="Saving…">Accept</SubmitButton>
        </form>
      )}

      <h2 className="mt-8 text-2xl">Invite your vendors</h2>
      <p className="mt-1 max-w-2xl text-navy-soft">
        Add businesses you trust (up to {MAX_INVITES}). Only add businesses that are happy for us to contact them. Our team helps each one claim
        their business, and nothing is emailed until we&rsquo;ve checked in.
      </p>

      {rows > 0 ? (
        <form action={inviteVendorsAction} className="mt-5 space-y-4">
          <input type="hidden" name="place_id" value={place.id} />
          {Array.from({ length: rows }, (_, i) => (
            <fieldset key={i} className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-5">
              <legend className="sr-only">Business {i + 1}</legend>
              <label className="text-sm font-medium">Business name<input name={`name_${i}`} maxLength={120} className={inputClass} /></label>
              <label className="text-sm font-medium">What they do
                <select name={`category_${i}`} defaultValue="" className={inputClass}>
                  <option value="">Choose…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">City<input name={`city_${i}`} maxLength={120} className={inputClass} /></label>
              <label className="text-sm font-medium">Contact email<input name={`email_${i}`} type="email" maxLength={254} className={inputClass} /></label>
              <label className="text-sm font-medium">Note <span className="font-normal text-navy-soft">(optional)</span><input name={`note_${i}`} maxLength={500} className={inputClass} /></label>
            </fieldset>
          ))}
          <SubmitButton pendingLabel="Adding…">Send to our team</SubmitButton>
        </form>
      ) : (
        <p className="mt-5 rounded-2xl bg-white p-6 ring-1 ring-line">You&rsquo;ve invited {MAX_INVITES} businesses, the most for now. Thank you!</p>
      )}

      {invites.length > 0 && (
        <section className="mt-8" aria-labelledby="invited-heading">
          <h3 id="invited-heading" className="text-lg font-semibold">Businesses you&rsquo;ve invited ({invites.length} of {MAX_INVITES})</h3>
          <ul className="mt-3 divide-y divide-line rounded-2xl bg-white ring-1 ring-line">
            {invites.map((v) => (
              <li key={v.id} className="flex flex-wrap justify-between gap-2 px-5 py-3 text-sm">
                <span><strong>{v.name}</strong>{v.city ? ` · ${v.city}` : ""}</span>
                <span className="text-navy-soft">{v.claimed ? "Joined" : (statusLabel[v.status] ?? v.status)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </DashboardShell>
  );
}
