import { connection } from "next/server";
import { ComingSoon } from "@/components/ComingSoon";
import { readiness } from "@/lib/readiness";

/** Unsubscribing needs the database; until it's reachable, point people to the contact form. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  // Checked per request: setup finishing must show up without a rebuild.
  await connection();
  const r = await readiness();
  if (!(r.db && r.secret)) return <ComingSoon title="Unsubscribing opens soon." body="Use our contact form and we'll take you off our list right away." />;
  return children;
}
