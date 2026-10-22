import type { Metadata } from "next";
import { SignUpForm } from "@/app/auth/auth-forms";
import { PageHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Create a cleaning company account" };

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader
        title="Create a cleaning company account"
        intro="For commercial cleaning companies that want walkthrough appointments. Referral partners apply on the partner page."
      />
      <div className="card">
        <SignUpForm />
      </div>
    </div>
  );
}
