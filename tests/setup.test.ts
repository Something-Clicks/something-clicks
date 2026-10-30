import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { dataChecks, domainChecks, envChecks, migrationChecks } from "@/lib/setup/checks";
import { MIGRATIONS } from "@/lib/setup/migrations";

const full = {
  SITE_URL: "https://somethingclicks.com",
  SUPABASE_URL: "https://x.supabase.co",
  SUPABASE_ANON_KEY: "a",
  SUPABASE_SERVICE_ROLE_KEY: "s",
  SUPABASE_DB_URL: "postgresql://postgres.x:pw@aws-0-us-east-2.pooler.supabase.com:6543/postgres",
  ADMIN_EMAIL: "matt@example.com",
  ADMIN_SESSION_SECRET: "x".repeat(48),
  RATE_LIMIT_SALT: "salt",
  RESEND_API_KEY: "re_x",
  NOTIFY_EMAIL_TO: "matt@example.com",
  NOTIFY_EMAIL_FROM: "Something Clicks <hello@somethingclicks.com>",
};

describe("migration list", () => {
  it("matches supabase/migrations exactly", () => {
    const files = readdirSync(join(__dirname, "..", "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
    expect(MIGRATIONS.map((m) => `${m.version}_${m.name}.sql`)).toEqual(files);
  });

  it("counts dashboard-applied migrations by name", () => {
    const checks = migrationChecks([{ version: "20261030123445", name: "init" }, { version: "20261031000000", name: "" }]);
    expect(checks.map((c) => c.status)).toEqual(["ok", "ok", "missing", "missing", "missing", "missing"]);
    expect(checks[2].fix).toContain("job migrate");
  });
});

describe("environment checks", () => {
  it("is all green with every launch variable, and later items stay grey", () => {
    const checks = envChecks(full);
    expect(checks.filter((c) => c.status !== "later").every((c) => c.status === "ok")).toBe(true);
    expect(checks.find((c) => c.label === "ANTHROPIC_API_KEY")?.status).toBe("later");
  });

  it("flags missing, short and wrong-port values with a fix", () => {
    const checks = envChecks({ ...full, RESEND_API_KEY: "", ADMIN_SESSION_SECRET: "short", SUPABASE_DB_URL: full.SUPABASE_DB_URL.replace("6543", "5432") });
    const by = (k: string) => checks.find((c) => c.label === k)!;
    expect(by("RESEND_API_KEY").status).toBe("missing");
    expect(by("RESEND_API_KEY").fix).toMatch(/Redeploy/);
    expect(by("ADMIN_SESSION_SECRET").status).toBe("missing");
    expect(by("SUPABASE_DB_URL")).toMatchObject({ status: "warn", detail: "Uses port 5432." });
    expect(checks.every((c) => c.status === "ok" || c.fix)).toBe(true);
  });
});

describe("domain checks", () => {
  it("is green only on the SITE_URL host in production", () => {
    expect(domainChecks("somethingclicks.com", { SITE_URL: full.SITE_URL, VERCEL_ENV: "production" }).every((c) => c.status === "ok")).toBe(true);
    const preview = domainChecks("sc-abc.vercel.app", { SITE_URL: full.SITE_URL, VERCEL_ENV: "preview" });
    expect(preview.map((c) => c.status)).toEqual(["missing", "warn"]);
    expect(preview[0].detail).toContain("sc-abc.vercel.app");
  });
});

describe("data checks", () => {
  it("lists each load in order and needs matches for every metro", () => {
    const at = new Date();
    const checks = dataChecks({
      runs: [{ kind: "counts", slug: null, finished_at: at }, { kind: "cluster", slug: "us-weddings", finished_at: at }, { kind: "cluster", slug: "dfw-weddings", finished_at: at }],
      placeCounts: 100,
      geoLookup: 50,
      matchesBySlug: { "dfw-weddings": 10 },
      metros: ["dfw-weddings", "atl-weddings"],
    });
    expect(checks.map((c) => [c.label, c.status])).toEqual([
      ["National counts and location lookup", "ok"],
      ["us-weddings import", "ok"],
      ["dfw-weddings import", "ok"],
      ["dfw-weddings matches", "ok"],
      ["atl-weddings import", "missing"],
      ["atl-weddings matches", "missing"],
    ]);
    expect(checks[4].fix).toContain("cluster atl-weddings");
  });
});
