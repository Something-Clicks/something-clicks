export function NetworkNotConfigured() {
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-line">
      <h1 className="text-2xl">Network database not connected</h1>
      <p className="mt-2 text-navy-soft">
        Set <code>SUPABASE_DB_URL</code> to the Supabase connection string, run the migrations in{" "}
        <code>supabase/migrations</code>, then seed and import a cluster (see the README).
      </p>
    </div>
  );
}
