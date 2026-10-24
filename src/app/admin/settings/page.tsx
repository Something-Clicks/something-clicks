import { saveSettings } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PromoteKitTest } from "./promotekit-test";

const dollars = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2));

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const { saved, error } = await searchParams;
  const { data: s } = await supabaseAdmin().from("settings").select("*").maybeSingle();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      {saved ? <p className="mt-3 text-sm text-brand-700">Saved.</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700">Check the values and try again.</p> : null}
      <form action={saveSettings} className="card mt-6 space-y-4">
        <label className="block text-sm">
          Price per appointment (USD)
          <input name="price_per_appointment" type="number" step="0.01" min="0.01" defaultValue={dollars(s?.price_per_appointment_cents ?? null)} className="input mt-1" />
          <span className="text-xs text-zinc-500">Used as the revenue amount reported for each commission.</span>
        </label>
        <label className="block text-sm">
          Partner commission per completed walkthrough (USD)
          <input name="commission_amount" type="number" step="0.01" min="0.01" defaultValue={dollars(s?.commission_amount_cents ?? null)} className="input mt-1" />
          <span className="text-xs text-zinc-500">Leave blank to keep commissions blocked. Internal setting only: it is not shown on the public site and does not publish a reward or open the partner program.</span>
        </label>
        <label className="block text-sm">
          Dispute window (hours)
          <input name="dispute_window_hours" type="number" min={1} required defaultValue={s?.dispute_window_hours ?? 72} className="input mt-1" />
        </label>
        <label className="block text-sm">
          Unconfirmed referral expiry (days)
          <input name="referral_expiry_days" type="number" min={1} required defaultValue={s?.referral_expiry_days ?? 14} className="input mt-1" />
        </label>
        <SubmitButton>Save settings</SubmitButton>
      </form>
      <PromoteKitTest />
    </div>
  );
}
