"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ConsentCheckbox, FormMessage, Honeypot, SelectField, TextArea, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { BUSINESS_CONSENT_TEXT, CLEANING_FREQUENCIES, PROPERTY_TYPES } from "@/lib/constants";
import { initialFormState } from "@/lib/forms";
import { requestWalkthrough } from "./actions";

/** Shown in place of the form once a request (or a repeat request) has been saved. */
export function BookingResult({ message }: { message?: string }) {
  return (
    <div role="status" className="py-4">
      <h2 className="text-2xl font-bold tracking-tight">Request received</h2>
      <p className="mt-2 text-zinc-700">{message ?? "We'll review your request and contact you with next steps."}</p>
      <Link href="/" className="mt-6 inline-block font-medium text-brand-700 underline underline-offset-4">
        Back to the homepage
      </Link>
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="text-lg font-semibold">
        <span className="mr-2 text-sm font-semibold text-brand-700">{step}.</span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function BookingForm({ urlCode }: { urlCode: string | null }) {
  const [state, action] = useActionState(requestWalkthrough, initialFormState);

  if (state.status === "success") return <BookingResult message={state.message} />;

  return (
    <form action={action} className="relative space-y-10" noValidate>
      <Honeypot />
      <input type="hidden" name="url_code" value={urlCode ?? ""} />
      <FormMessage state={state} />
      <p className="text-sm text-zinc-500">
        Fields marked <span className="text-red-600">*</span> are required.
      </p>

      <Section step={1} title="Your business">
        <TextField name="business_name" label="Business name" required state={state} autoComplete="organization" />
        <TextField name="address_line1" label="Street address" required state={state} autoComplete="street-address" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="city" label="City" required state={state} autoComplete="address-level2" />
          <TextField name="zip" label="ZIP code" required state={state} autoComplete="postal-code" />
        </div>
      </Section>

      <Section step={2} title="Your space">
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField name="property_type" label="Property type" options={PROPERTY_TYPES} required state={state} />
          <TextField name="approx_sq_ft" label="Approximate square feet" type="number" required state={state} />
          <SelectField
            name="cleaning_frequency"
            label="How often do you need cleaning?"
            options={CLEANING_FREQUENCIES}
            required
            state={state}
          />
          <TextField
            name="current_contract_end"
            label="Current cleaning contract ends"
            hint="Optional. Leave blank if you don't have one."
            type="date"
            state={state}
          />
        </div>
        <TextArea name="notes" label="Anything else we should know?" hint="Optional." rows={3} state={state} />
      </Section>

      <Section step={3} title="How to reach you">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="contact_name" label="Your name" required state={state} autoComplete="name" />
          <TextField name="contact_title" label="Your title" hint="Optional." state={state} autoComplete="organization-title" />
          <TextField name="email" label="Email" type="email" required state={state} autoComplete="email" />
          <TextField name="phone" label="Phone" type="tel" required state={state} autoComplete="tel" />
          <SelectField
            name="is_decision_maker"
            label="Do you decide who to hire for cleaning?"
            options={[
              { value: "yes", label: "Yes, I make (or share) this decision" },
              { value: "no", label: "No, someone else decides" },
            ]}
            required
            state={state}
          />
          <TextField
            name="preferred_times"
            label="Best days and times for a walkthrough"
            hint="Optional, e.g. weekday mornings."
            state={state}
          />
        </div>
      </Section>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <ConsentCheckbox name="consent" state={state}>
          {BUSINESS_CONSENT_TEXT}{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-brand-700 underline">
            Privacy
          </Link>
        </ConsentCheckbox>
      </div>

      <SubmitButton pendingText="Sending…" className="btn w-full !py-3 !text-base sm:w-auto">
        Send request
      </SubmitButton>
    </form>
  );
}
