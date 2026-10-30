import { connection } from "next/server";
import { ComingSoon } from "@/components/ComingSoon";
import { readiness } from "@/lib/readiness";

/** The sign-in link landing needs accounts; until they're live, show a friendly placeholder. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  // Checked per request: setup finishing must show up without a rebuild.
  await connection();
  if (!(await readiness()).members) {
    return <main className="min-h-screen bg-cloud"><ComingSoon title="Accounts open soon." body="We're finishing setup. Check back shortly to sign in." /></main>;
  }
  return children;
}
