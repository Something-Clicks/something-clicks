import { AgreementPage } from "@/components/AgreementPage";
import { currentAgreement } from "@/lib/planner/partners";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Planner Partner Agreement",
  path: "/planner-partners/agreement",
  description: "The current Planner Partner Agreement between Something Clicks and wedding planners in the Planner Partner program.",
});

export default function CurrentAgreementPage() {
  return <AgreementPage a={currentAgreement()} current />;
}
