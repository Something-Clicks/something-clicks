import { ComingSoon } from "@/components/ComingSoon";
import { readiness } from "@/lib/readiness";

/** Sign-in needs accounts; until they're live, show a friendly placeholder. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const r = await readiness();
  if (!(r.members)) return <ComingSoon title="Accounts open soon." body="We're finishing setup. Check back shortly to sign in." />;
  return children;
}
