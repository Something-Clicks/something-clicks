import postgres from "postgres";

/**
 * Direct Postgres connection for the network features (PostGIS queries,
 * matching). Uses SUPABASE_DB_URL — in production, Supabase's pooled
 * connection string. prepare: false is required by the transaction pooler.
 */
const globalForSql = globalThis as unknown as { __scSql?: postgres.Sql };

export const dbConfigured = () => Boolean(process.env.SUPABASE_DB_URL);

export function sql(): postgres.Sql {
  // Pasted values often carry a trailing newline, which ends up in the database name.
  const url = process.env.SUPABASE_DB_URL?.trim();
  if (!url) throw new Error("SUPABASE_DB_URL is not set.");
  return (globalForSql.__scSql ??= postgres(url, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 }));
}
