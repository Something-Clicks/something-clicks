import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site-chrome";

export const metadata: Metadata = { title: "For cleaning companies" };

const steps = [
  {
    title: "Create your account",
    body: "Tell us your service area, the properties you clean, and when you can do walkthroughs.",
  },
  { title: "We review your company", body: "You can buy the pilot once your company is approved." },
  {
    title: "Buy the pilot",
    body: "Pay through Stripe's secure checkout. Your credits appear on your dashboard once Stripe confirms the payment.",
  },
  {
    title: "Walkthroughs are arranged with you directly",
    body:
      "For now, the Something Clicks team handles this personally, not through your dashboard. When a request fits " +
      "your service area and criteria, we'll be in touch about it.",
  },
];

export default function CleaningCompaniesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <PageHeader
        title="Walkthroughs with businesses that asked for one."
        intro="Something Clicks is built for commercial cleaning companies. You pay for walkthroughs with Salt Lake Valley businesses that have asked for a commercial cleaning walkthrough. Businesses use the service for free."
      />

      <section aria-labelledby="pilot" className="rounded-lg border border-brand-100 bg-brand-50 p-5 shadow-sm sm:p-6">
        <h2 id="pilot" className="text-sm font-semibold uppercase tracking-wide text-brand-700">
          The pilot
        </h2>
        <p className="mt-2 text-3xl font-bold tracking-tight">$750</p>
        <p className="mt-1 text-lg text-zinc-800">for 5 qualifying completed walkthroughs · $150 each</p>
        <p className="mt-3 max-w-2xl text-zinc-700">
          You pay for walkthroughs that qualify and are completed, not for scheduled ones. A scheduled walkthrough on its own
          doesn&apos;t count. The{" "}
          <Link href="/terms/buyer" className="font-medium text-brand-700 underline underline-offset-4">
            buyer terms
          </Link>{" "}
          (draft) explain what qualifies and how credits are held, used, and returned.
        </p>
        <Link href="/signup" className="btn btn-lg mt-6">
          Create an account
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-6 space-y-5">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-zinc-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">What each walkthrough request includes</h2>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-zinc-700">
          <li>Business name, contact details, and address</li>
          <li>Property type, approximate square footage, and how often they need cleaning</li>
          <li>Whether the contact makes the hiring decision, and when their current contract ends</li>
          <li>The business&apos;s consent to be contacted by one cleaning company</li>
        </ul>
        <p className="mt-4 text-zinc-600">
          Each request is shared with one cleaning company. A walkthrough is a chance to quote; we can&apos;t promise that a
          business will hire you.
        </p>
      </section>

      <div className="mt-12 border-t border-zinc-200 pt-8">
        <Link href="/signup" className="btn btn-lg">
          Create an account
        </Link>
        <p className="mt-3 text-sm text-zinc-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-700 underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
