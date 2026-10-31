import { notFound } from "next/navigation";
import { AgreementPage } from "@/components/AgreementPage";
import { plannerPartnerAgreements } from "@/content/agreements/planner-partner";
import { agreementByVersion, currentAgreement } from "@/lib/planner/partners";
import { pageMeta } from "@/lib/metadata";

type Params = { params: Promise<{ version: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return plannerPartnerAgreements.map((a) => ({ version: `v${a.version}` }));
}

export async function generateMetadata({ params }: Params) {
  const a = agreementByVersion((await params).version.replace(/^v/, ""));
  if (!a) return {};
  return pageMeta({
    title: `Planner Partner Agreement v${a.version}`,
    path: `/planner-partners/agreement/v${a.version}`,
    description: `Version ${a.version} of the Planner Partner Agreement, effective ${a.effective}.`,
  });
}

export default async function VersionPage({ params }: Params) {
  const a = agreementByVersion((await params).version.replace(/^v/, ""));
  if (!a) notFound();
  return <AgreementPage a={a} current={a.version === currentAgreement().version} />;
}
