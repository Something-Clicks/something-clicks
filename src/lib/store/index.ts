import { createMemoryStore } from "./memory";
import { createSupabaseStore } from "./supabase";
import type { Store } from "./types";

export * from "./types";

const globalForStore = globalThis as unknown as { __scStore?: Store; __scStoreWarned?: boolean };

/**
 * Supabase when configured. Without configuration, development falls back to
 * an in-memory store; production refuses to run without a database.
 */
export function getStore(): Store {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return createSupabaseStore(url, key);

  if (process.env.NODE_ENV === "production") {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production.");
  }
  if (!globalForStore.__scStoreWarned) {
    console.warn("[store] Supabase not configured; using in-memory store (development only).");
    globalForStore.__scStoreWarned = true;
  }
  return (globalForStore.__scStore ??= createMemoryStore());
}
