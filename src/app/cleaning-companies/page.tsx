import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "For cleaning companies" };

export default function CleaningCompaniesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <PageHeader
        title="Exclusive walkthrough appointments for commercial cleaning companies"
        intro="Something Clicks books walkthroughs with Salt Lake Valley businesses that asked for a commercial cleaning quote — referred by people they trust, and shared with one cleaning company only: you."
      />
      <div className="prose-sc">
        <h2>How it works</h2>
        <ul>
          <li>Create an account, tell us your service area, the properties you clean, and when you can do walkthroughs.</li>
          <li>We review and approve your company.</li>
          <li>Prepay for a pack of appointment credits by card or bank transfer through Stripe.</li>
          <li>When a business that matches your area and criteria books, the appointment is yours alone, and one credit is held.</li>
          <li>After the walkthrough, you confirm it happened. If the business doesn&apos;t show or cancels, the credit comes back to you.</li>
        </ul>
        <h2>What a qualified appointment includes</h2>
        <ul>
          <li>Business name, contact, and address in your service area</li>
          <li>Property type, approximate square footage, and cleaning frequency</li>
          <li>Whether the contact makes the decision, and when their current contract ends</li>
          <li>The business&apos;s explicit consent to be contacted by one cleaning company</li>
        </ul>
      </div>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/signup" className="btn">
          Create a cleaning company account
        </Link>
        <Link href="/terms/buyer" className="btn-secondary">
          Read the buyer terms
        </Link>
      </div>
    </div>
  );
}
