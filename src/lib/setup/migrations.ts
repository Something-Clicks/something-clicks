/**
 * The files in supabase/migrations, in order. Listed here because the
 * deployed site can't read the repo; tests/setup.test.ts fails if this list
 * and the folder ever differ.
 */
export const MIGRATIONS = [
  { version: "20261030000000", name: "init" },
  { version: "20261031000000", name: "network_foundation" },
  { version: "20261031010000", name: "matching" },
  { version: "20261031020000", name: "metro_and_national" },
  { version: "20261031030000", name: "skip_unchanged_matches" },
  { version: "20261101000000", name: "members_claims_introductions" },
  { version: "20261102000000", name: "ai_review_and_outcomes" },
  { version: "20261103000000", name: "unconfirmed_sources" },
  { version: "20261104000000", name: "vocabulary" },
  { version: "20261106000000", name: "planner_partners" },
] as const;
