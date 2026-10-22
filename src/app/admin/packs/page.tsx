import { createPack, togglePack } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import { formatCents } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Pack = { id: string; name: string; credits: number; price_cents: number; active: boolean };

export default async function PacksPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const { data } = await supabaseAdmin()
    .from("credit_packs")
    .select("id, name, credits, price_cents, active")
    .order("sort_order")
    .order("price_cents");
  const packs = (data ?? []) as Pack[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Credit packs</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Approved buyers see active packs on their dashboard. Prices can&apos;t be edited after creation (purchases record
          the price paid); deactivate a pack and create a new one instead.
        </p>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Credits</th>
            <th>Price</th>
            <th>Per appointment</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {packs.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.credits}</td>
              <td>{formatCents(p.price_cents)}</td>
              <td>{formatCents(Math.round(p.price_cents / p.credits))}</td>
              <td>{p.active ? "On sale" : "Inactive"}</td>
              <td>
                <form action={togglePack}>
                  <input type="hidden" name="pack_id" value={p.id} />
                  <input type="hidden" name="active" value={String(!p.active)} />
                  <SubmitButton className="btn-secondary !py-1">{p.active ? "Deactivate" : "Activate"}</SubmitButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!packs.length ? <p className="text-sm text-zinc-600">No packs yet. Create one below, e.g. a 5-appointment pilot pack.</p> : null}

      <form action={createPack} className="card flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Name
          <input name="name" required placeholder="Pilot pack" className="input mt-1" />
        </label>
        <label className="text-sm">
          Credits
          <input name="credits" type="number" min={1} required defaultValue={5} className="input mt-1 w-24" />
        </label>
        <label className="text-sm">
          Price (USD)
          <input name="price_dollars" type="number" min={1} step="0.01" required className="input mt-1 w-32" />
        </label>
        <SubmitButton>Create pack</SubmitButton>
        {error ? <p className="w-full text-sm text-red-700">Check the name, credits, and price.</p> : null}
      </form>
    </div>
  );
}
