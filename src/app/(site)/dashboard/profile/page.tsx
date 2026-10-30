import type { Metadata } from "next";
import { DashboardShell } from "@/components/members/DashboardShell";
import { NoBusiness } from "@/components/members/NoBusiness";
import { Field, Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { loadDashboard } from "@/lib/members/dashboard";
import { saveProfileAction } from "../actions";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

type Search = { place?: string; done?: string; error?: string; welcome?: string };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const ctx = await loadDashboard("/dashboard/profile", sp.place);
  if (ctx.kind === "none") return <NoBusiness email={ctx.member.email} pending={ctx.pending} />;
  const p = ctx.place;
  return (
    <DashboardShell active="/dashboard/profile" place={p} places={ctx.places} incoming={ctx.incoming}>
      <div className="max-w-2xl">
        {sp.welcome && <Notice tone="success">You&rsquo;re verified. Confirm a few details and you&rsquo;re done.</Notice>}
        {sp.error && <Notice>{sp.error}</Notice>}
        {sp.done === "saved" && <Notice tone="success">Saved.</Notice>}
        <form action={saveProfileAction} className="mt-6 space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
          <input type="hidden" name="place_id" value={p.id} />
          {sp.welcome && <input type="hidden" name="welcome" value="1" />}
          <Field label="What you do, in a sentence" name="description" textarea optional maxLength={500} rows={2} defaultValue={p.description}
                 placeholder="Natural-light wedding photography across North Texas." />
          <Field label="Area you serve" name="service_area" optional maxLength={200} defaultValue={p.service_area} placeholder="Dallas–Fort Worth" />
          <fieldset className="space-y-4">
            <legend className="font-medium">Contact details</legend>
            <p className="text-sm text-navy-soft">Shared only with businesses you connect with, after you both accept.</p>
            <Field label="Name" name="contact_name" optional maxLength={120} autoComplete="name" defaultValue={p.contact_name} />
            <Field label="Email" name="contact_email" type="email" required maxLength={254} autoComplete="email" defaultValue={p.contact_email} />
            <Field label="Phone" name="contact_phone" type="tel" optional maxLength={40} autoComplete="tel" defaultValue={p.contact_phone || p.phone} />
          </fieldset>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-ice p-4">
            <input type="checkbox" name="network_opt_in" defaultChecked={p.network_opt_in || Boolean(sp.welcome)} className="mt-1 h-5 w-5 accent-royal" />
            <span>
              <span className="block font-semibold">Join the network</span>
              <span className="block text-sm text-navy-soft">
                Your matches can request introductions with you, and you with them. You choose who to accept. Turn it off anytime.
              </span>
            </span>
          </label>
          <SubmitButton pendingLabel="Saving…">{sp.welcome ? "Done" : "Save"}</SubmitButton>
        </form>
      </div>
    </DashboardShell>
  );
}
