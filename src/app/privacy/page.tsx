import type { Metadata } from "next";
import { PlaceholderNotice } from "@/components/placeholder-notice";
import { PageHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader title="Privacy" />
      <PlaceholderNotice version="2026-10-draft" />
      <div className="prose-sc">
        <p>
          [Placeholder] When you request a walkthrough, we share your details with one commercial cleaning company
          only, and only after you agree. Referral partners see your business name and the status of the referral,
          never your contact details unless you agree.
        </p>
        <p>[Placeholder] What we collect, why, how long we keep it, and how to ask us to delete it.</p>
      </div>
    </div>
  );
}
