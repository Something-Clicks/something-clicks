import { ComingSoon } from "@/components/ComingSoon";
import { readiness } from "@/lib/readiness";

/** Unsubscribing needs the database; until it's reachable, point people to the contact form. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const r = await readiness();
  if (!(r.db && r.secret)) return <ComingSoon title="Unsubscribing opens soon." body="Use our contact form and we'll take you off our list right away." />;
  return children;
}
