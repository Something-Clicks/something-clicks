import { connection } from "next/server";
import { ComingSoon } from "@/components/ComingSoon";
import { readiness } from "@/lib/readiness";

/** The dashboard needs accounts; until they're live, show a friendly placeholder. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  // Checked per request: setup finishing must show up without a rebuild.
  await connection();
  const r = await readiness();
  if (!(r.members)) return <ComingSoon title="Accounts open soon." body="We're finishing setup. Check back shortly to see your matches." />;
  return children;
}
