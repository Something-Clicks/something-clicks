import { ComingSoon } from "@/components/ComingSoon";
import { readiness } from "@/lib/readiness";

/** Removal requests need the database; until it's reachable, point people to the contact form. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const r = await readiness();
  if (!(r.db)) return <ComingSoon title="Removal requests open soon." body="Our form isn't live yet. Use our contact form and we'll remove the business by hand." />;
  return children;
}
