import type { Metadata } from "next";
import { SignUpForm } from "@/app/auth/auth-forms";
import { PageHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Apply for the pilot" };

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader
        title="Apply for the pilot"
        intro="For commercial cleaning companies. Create an account, then tell us about your company. We review every application before you can buy the pilot."
      />
      <div className="card">
        <SignUpForm />
      </div>
    </div>
  );
}
