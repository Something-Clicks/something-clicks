import { sql } from "@/lib/db";
import { getStore } from "@/lib/store";
import { MIGRATIONS } from "./migrations";

/**
 * Production readiness, for /admin/setup. Every check says what's wrong in
 * one line and how to fix it. Values are never shown, only whether they're set.
 */

export type Status = "ok" | "missing" | "warn" | "later";
export type Check = { group: string; label: string; status: Status; detail?: string; fix?: string };

const VERCEL = "Vercel → your project → Settings → Environment Variables → add it, then Redeploy.";
const MIGRATE = "GitHub → Actions → Overture import → Run workflow: job migrate, mode load.";
const BUDGET_MB = 400;

type Env = Record<string, string | undefined>;

const required: [string, string][] = [
  ["SITE_URL", "https://somethingclicks.com (Production only)."],
  ["SUPABASE_URL", "Supabase → Project Settings → Data API → Project URL."],
  ["SUPABASE_ANON_KEY", "Supabase → Project Settings → API Keys → publishable (anon) key."],
  ["SUPABASE_SERVICE_ROLE_KEY", "Supabase → Project Settings → API Keys → secret (service_role) key. Mark it Sensitive."],
  ["SUPABASE_DB_URL", "Supabase → Connect → Transaction pooler string (port 6543), with your database password in it."],
  ["ADMIN_EMAIL", "The email you sign in to the admin with."],
  ["ADMIN_SESSION_SECRET", "48 random characters (openssl rand -base64 48). Also signs member sessions."],
  ["RATE_LIMIT_SALT", "Any long random string."],
  ["RESEND_API_KEY", "Resend → API Keys → Create (Sending access). Without it, members can't sign in."],
  ["NOTIFY_EMAIL_TO", "Where new-submission alerts go (your email)."],
  ["NOTIFY_EMAIL_FROM", "e.g. Something Clicks <hello@somethingclicks.com>, on a domain verified in Resend."],
];

const later: [string, string][] = [
  ["STRIPE_SECRET_KEY", "Stripe → Developers → API keys → Secret key (sk_test_… on Preview, sk_live_… on Production). Mark it Sensitive. Turns on paid plans."],
  ["STRIPE_WEBHOOK_SECRET", "Stripe → Developers → Webhooks → your endpoint for /api/stripe/webhook → Signing secret (whsec_…)."],
  ["STRIPE_PRICE_CAMPAIGN", "The price id of the one-time Managed campaign (price_…)."],
  ["STRIPE_PRICE_MEMBERSHIP", "The price id of the monthly Membership (price_…)."],
  ["NEXT_PUBLIC_PROMOTEKIT_SITE_ID", "PromoteKit → Settings → your public site id for the tracking script (not the API key)."],
  ["CRON_SECRET", "Any long random string. Lets the daily Planner Partner reminders run (Vercel sends it to the cron job)."],
  ["CLAIMS_OPEN", "Claiming is closed until this is set to true. Open it once listing quality is reviewed."],
  ["ANTHROPIC_API_KEY", "Phase 3 AI review and match reasons. Off until set; capped at $10 a month."],
  ["MAILING_ADDRESS", "Needed before any invitation can be sent (CAN-SPAM)."],
  ["INVITE_EMAIL_FROM", "Invitation sender on hello.somethingclicks.com, verified in Resend."],
  ["GA_MEASUREMENT_ID", "Optional Google Analytics 4 ID (G-…)."],
];

/** Variables only: no network or database. */
export function envChecks(env: Env = process.env): Check[] {
  const group = "Vercel environment variables";
  const out: Check[] = required.map(([key, fix]) => {
    const v = env[key]?.trim();
    if (!v) return { group, label: key, status: "missing", fix: `${fix} ${VERCEL}` };
    if (key === "ADMIN_SESSION_SECRET" && v.length < 32) return { group, label: key, status: "missing", detail: "Shorter than 32 characters.", fix: `${fix} ${VERCEL}` };
    if (key === "SITE_URL" && !/^https:\/\//.test(v)) return { group, label: key, status: "warn", detail: "Should start with https://.", fix };
    if (key === "SUPABASE_DB_URL") {
      const port = v.match(/@[^/:]+:(\d+)\//)?.[1];
      if (port && port !== "6543") {
        return { group, label: key, status: "warn", detail: `Uses port ${port}.`, fix: "On Vercel use the Transaction pooler string (port 6543); the session pooler (5432) is for GitHub Actions." };
      }
    }
    return { group, label: key, status: "ok" };
  });
  for (const [key, fix] of later) {
    out.push({ group: "Later (not needed to launch)", label: key, status: env[key]?.trim() ? "ok" : "later", fix });
  }
  return out;
}

/** The domain check: this page must be served from SITE_URL's host, in Vercel's production environment. */
export function domainChecks(host: string | null, env: Env = process.env): Check[] {
  const group = "Domain";
  let siteHost: string | null = null;
  try {
    siteHost = env.SITE_URL ? new URL(env.SITE_URL).host : null;
  } catch {}
  return [
    host && siteHost && host === siteHost
      ? { group, label: `Serving on ${siteHost}`, status: "ok" }
      : {
          group,
          label: siteHost ? `Serving on ${siteHost}` : "Custom domain",
          status: "missing",
          detail: host ? `This page was opened on ${host}.` : undefined,
          fix: "Vercel → Settings → Domains → add somethingclicks.com, copy the DNS records it shows into Cloudflare (DNS only, grey cloud), then open this page on that domain.",
        },
    env.VERCEL_ENV === "production"
      ? { group, label: "Production deployment", status: "ok" }
      : { group, label: "Production deployment", status: "warn", detail: `VERCEL_ENV is ${env.VERCEL_ENV ?? "not set (local)"}.`, fix: "Open the production URL, not a preview." },
  ];
}

type Applied = { version: string; name: string };

/** Migration rows count as applied by version or by name (the dashboard records its own timestamps). */
export function migrationChecks(applied: Applied[]): Check[] {
  const versions = new Set(applied.map((a) => a.version));
  const names = new Set(applied.map((a) => a.name));
  return MIGRATIONS.map((m) => ({
    group: "Database migrations",
    label: `${m.version}_${m.name}.sql`,
    status: versions.has(m.version) || names.has(m.name) ? "ok" : "missing",
    fix: MIGRATE,
  }));
}

type Run = { kind: string; slug: string | null; finished_at: Date | null };

/** Each data load in order, done when its last successful load exists (and, for metros, matches were generated). */
export function dataChecks(o: { runs: Run[]; placeCounts: number; geoLookup: number; matchesBySlug: Record<string, number>; metros: string[] }): Check[] {
  const group = "Data loads";
  const run = (kind: string, slug: string | null) => o.runs.find((r) => r.kind === kind && r.slug === slug);
  const job = (job: string, cluster?: string) => `GitHub → Actions → Overture import → Run workflow: job ${job}${cluster ? `, cluster ${cluster}` : ""}${job === "matches" ? "" : ", dry-run first, then load"}.`;
  const out: Check[] = [
    run("counts", null) && o.placeCounts > 0 && o.geoLookup > 0
      ? { group, label: "National counts and location lookup", status: "ok", detail: `${o.placeCounts.toLocaleString()} ZIP-category counts, ${o.geoLookup.toLocaleString()} places.` }
      : { group, label: "National counts and location lookup", status: "missing", fix: job("national") },
    run("cluster", "us-weddings")
      ? { group, label: "us-weddings import", status: "ok" }
      : { group, label: "us-weddings import", status: "missing", fix: job("import", "us-weddings") },
  ];
  for (const slug of o.metros) {
    out.push(
      run("cluster", slug)
        ? { group, label: `${slug} import`, status: "ok" }
        : { group, label: `${slug} import`, status: "missing", fix: job("import", slug) },
      (o.matchesBySlug[slug] ?? 0) > 0
        ? { group, label: `${slug} matches`, status: "ok", detail: `${o.matchesBySlug[slug].toLocaleString()} matches.` }
        : { group, label: `${slug} matches`, status: "missing", fix: job("matches", slug) },
    );
  }
  return out;
}

const safe = async <T,>(f: () => Promise<T>): Promise<{ ok: true; v: T } | { ok: false; error: string }> => {
  try {
    return { ok: true, v: await f() };
  } catch (e) {
    return { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 160) };
  }
};

/** Everything that needs the database or Supabase API. Each failure becomes a red item rather than an error page. */
export async function liveChecks(env: Env = process.env): Promise<Check[]> {
  const out: Check[] = [];
  const db = "Database (Supabase)";

  const api = await safe(() => getStore().list("contacts", { limit: 1 }));
  out.push(
    api.ok && env.SUPABASE_URL
      ? { group: db, label: "Supabase API keys work", status: "ok" }
      : { group: db, label: "Supabase API keys work", status: "missing", detail: api.ok ? "Using the local in-memory store." : api.error, fix: "Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel, then Redeploy." },
  );

  if (!env.SUPABASE_DB_URL) {
    out.push({ group: db, label: "Database connection", status: "missing", fix: "Set SUPABASE_DB_URL in Vercel (Transaction pooler, port 6543), then Redeploy." });
    return out;
  }
  const conn = await safe(() => sql()`select 1`);
  if (!conn.ok) {
    out.push({ group: db, label: "Database connection", status: "missing", detail: conn.error, fix: "Re-copy the Transaction pooler string from Supabase → Connect, with the right password, then Redeploy." });
    return out;
  }
  out.push({ group: db, label: "Database connection", status: "ok" });

  const size = await safe(() => sql()<{ mb: number }[]>`select (pg_database_size(current_database()) / 1048576.0)::float as mb`);
  if (size.ok) {
    const mb = size.v[0].mb;
    out.push({
      group: db,
      label: "Database size",
      status: mb > BUDGET_MB ? "missing" : mb > BUDGET_MB * 0.9 ? "warn" : "ok",
      detail: `${Math.round(mb)} MB of the ${BUDGET_MB} MB budget (free tier: 500 MB).`,
      fix: mb > BUDGET_MB * 0.9 ? "Don't load more metros until we've talked about Supabase Pro." : undefined,
    });
  }

  const history = await safe(() => sql()<Applied[]>`select version, coalesce(name, '') as name from supabase_migrations.schema_migrations`);
  out.push(...migrationChecks(history.ok ? history.v : []));

  // The site can't read GitHub secrets; a database row only a GitHub Actions run writes is the evidence.
  const runs = await safe(() => sql()<(Run & { status: string })[]>`
    select r.kind, c.slug, r.finished_at, r.status from import_runs r left join clusters c on c.id = r.cluster_id
    where r.status = 'succeeded' order by r.finished_at desc nulls last`);
  const loads = runs.ok ? runs.v : [];
  const migratedByJob = history.ok && history.v.some((h) => MIGRATIONS.some((m) => m.version === h.version));
  out.push(
    loads.length || migratedByJob
      ? { group: "GitHub Actions", label: "SUPABASE_DB_URL secret", status: "ok", detail: "A GitHub Actions run has reached the database." }
      : { group: "GitHub Actions", label: "SUPABASE_DB_URL secret", status: "missing", detail: "No GitHub Actions run has reached the database yet.", fix: "GitHub → Settings → Secrets and variables → Actions → New repository secret SUPABASE_DB_URL (Session pooler, port 5432); then run the migrate job." },
  );

  const counts = await safe(async () => {
    const [[pc], [gl], m, metros] = await Promise.all([
      sql()<{ n: number }[]>`select count(*)::int as n from place_counts`,
      sql()<{ n: number }[]>`select count(*)::int as n from geo_lookup`,
      sql()<{ slug: string; n: number }[]>`select c.slug, count(*)::int as n from matches m join clusters c on c.id = m.cluster_id group by c.slug`,
      sql()<{ slug: string }[]>`select slug from clusters where scope = 'metro' and status = 'active' order by id`,
    ]);
    return { placeCounts: pc.n, geoLookup: gl.n, matchesBySlug: Object.fromEntries(m.map((r) => [r.slug, r.n])), metros: metros.map((r) => r.slug) };
  });
  if (counts.ok) {
    out.push(...dataChecks({ runs: loads, ...counts.v, metros: counts.v.metros.length ? counts.v.metros : ["dfw-weddings", "atl-weddings", "hou-weddings", "phx-weddings", "bna-weddings"] }));
  } else {
    out.push({ group: "Data loads", label: "Data tables", status: "missing", detail: counts.error, fix: MIGRATE });
  }
  return out;
}
