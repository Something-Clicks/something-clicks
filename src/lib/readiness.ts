import { sql } from "@/lib/db";

/**
 * What the live site can do right now, so pages show a friendly "coming soon"
 * instead of an error while production setup (variables, migrations, data
 * loads) is unfinished. Never throws; cached briefly so a missing or
 * unreachable database doesn't slow every request.
 */
export type Readiness = {
  /** Anonymous search: location lookup and national counts are loaded. */
  search: boolean;
  /** Business listings are loaded (claim search, removal by listing). */
  listings: boolean;
  /** Accounts, claims and introductions: their tables exist and sessions can be signed. */
  members: boolean;
  /** Metro features: matches generated and the metro functions exist. */
  metros: boolean;
  /** The database answers at all (removal requests, unsubscribes). */
  db: boolean;
  /** ADMIN_SESSION_SECRET is set: needed to sign sessions and read unsubscribe links. */
  secret: boolean;
  /** CLAIMS_OPEN=true: claiming (which shows listing details to the claimant) is open. Off until explicitly turned on. */
  claimsOpen: boolean;
};

const NONE: Readiness = { search: false, listings: false, members: false, metros: false, db: false, secret: false, claimsOpen: false };
const TTL_MS = 60_000;
const globalForReady = globalThis as unknown as { __scReady?: { at: number; value: Readiness } };

/** Claiming stays closed unless CLAIMS_OPEN is exactly "true". */
export const claimsOpen = () => process.env.CLAIMS_OPEN === "true";

export const sessionSecretSet = () => (process.env.ADMIN_SESSION_SECRET ?? "").length >= 32 || process.env.NODE_ENV === "development";

async function check(): Promise<Readiness> {
  if (!process.env.SUPABASE_DB_URL) return { ...NONE, secret: sessionSecretSet(), claimsOpen: claimsOpen() };
  try {
    const [r] = await sql()<{ geo: boolean; counts: boolean; places: boolean; members: boolean; claims: boolean; box: boolean; matches: boolean }[]>`
      select exists (select 1 from geo_lookup) as geo,
             exists (select 1 from place_counts) as counts,
             exists (select 1 from places where not suppressed) as places,
             to_regclass('public.members') is not null as members,
             to_regclass('public.place_claims') is not null as claims,
             to_regprocedure('public.cluster_box(public.clusters)') is not null as box,
             exists (select 1 from matches) as matches`;
    return {
      db: true,
      secret: sessionSecretSet(),
      claimsOpen: claimsOpen(),
      search: r.geo && r.counts,
      listings: r.places,
      members: r.members && r.claims && sessionSecretSet(),
      metros: r.box && r.matches,
    };
  } catch (error) {
    console.error("[readiness] database not ready", error instanceof Error ? error.message : error);
    return { ...NONE, secret: sessionSecretSet(), claimsOpen: claimsOpen() };
  }
}

export async function readiness(): Promise<Readiness> {
  const hit = globalForReady.__scReady;
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await check();
  globalForReady.__scReady = { at: Date.now(), value };
  return value;
}
