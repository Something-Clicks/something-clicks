import type { Metadata } from "next";
import { SignUpForm } from "@/app/auth/auth-forms";
import { PageHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Create your company account" };

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <PageHeader
        title="Create your company account"
        intro="For commercial cleaning companies. Next, you'll tell us about your company, and we'll review it before you can buy the pilot."
      />
      <div className="card">
        <SignUpForm />
      </div>
    </div>
  );
}
