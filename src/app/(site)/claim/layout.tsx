import { connection } from "next/server";
import { ComingSoon } from "@/components/ComingSoon";
import { readiness } from "@/lib/readiness";

/** Claiming needs listings, accounts and an explicit CLAIMS_OPEN=true; until then, show a friendly placeholder. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  // Checked per request: setup finishing must show up without a rebuild.
  await connection();
  const r = await readiness();
  if (!(r.claimsOpen && r.members && r.listings)) return <ComingSoon title="Claiming opens soon." body="We're loading wedding businesses now. Soon you'll be able to find yours, claim it, and see who fits." />;
  return children;
}
