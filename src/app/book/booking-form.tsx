"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ConsentCheckbox, FormMessage, Honeypot, SelectField, TextArea, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { BUSINESS_CONSENT_TEXT, CLEANING_FREQUENCIES, PROPERTY_TYPES } from "@/lib/constants";
import { initialFormState } from "@/lib/forms";
import { requestWalkthrough } from "./actions";

export function BookingForm({ urlCode }: { urlCode: string | null }) {
  const [state, action] = useActionState(requestWalkthrough, initialFormState);

  if (state.status === "success") return <FormMessage state={state} />;

  return (
    <form action={action} className="relative space-y-8" noValidate>
      <Honeypot />
      <input type="hidden" name="url_code" value={urlCode ?? ""} />
      <FormMessage state={state} />

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">Your business</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="business_name" label="Business name" required state={state} autoComplete="organization" />
          <TextField name="contact_name" label="Your name" required state={state} autoComplete="name" />
          <TextField name="contact_title" label="Your title" state={state} autoComplete="organization-title" />
          <TextField name="email" label="Email" type="email" required state={state} autoComplete="email" />
          <TextField name="phone" label="Phone" type="tel" required state={state} autoComplete="tel" />
        </div>
        <TextField name="address_line1" label="Street address" required state={state} autoComplete="street-address" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="city" label="City" required state={state} autoComplete="address-level2" />
          <TextField name="zip" label="ZIP code" required state={state} autoComplete="postal-code" />
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">Your space and cleaning needs</legend>
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
            name="current_contract_end"
            label="Current cleaning contract ends (if any)"
            type="date"
            state={state}
          />
          <TextField
            name="preferred_times"
            label="Best days/times for a walkthrough"
            placeholder="e.g. weekday mornings"
            state={state}
          />
        </div>
        <TextArea name="notes" label="Anything else we should know?" rows={3} state={state} />
      </fieldset>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
        <ConsentCheckbox name="consent" state={state}>
          {BUSINESS_CONSENT_TEXT}{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-brand-700 underline">
            Privacy
          </Link>
        </ConsentCheckbox>
      </div>

      <SubmitButton pendingText="Sending…">Request my walkthrough</SubmitButton>
    </form>
  );
}
