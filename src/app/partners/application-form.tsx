"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ConsentCheckbox, FormMessage, Honeypot, SelectField, TextArea, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { PARTNER_TYPES } from "@/lib/constants";
import { initialFormState } from "@/lib/forms";
import { applyAsPartner } from "./actions";

export function PartnerApplicationForm() {
  const [state, action] = useActionState(applyAsPartner, initialFormState);

  if (state.status === "success") return <FormMessage state={state} />;

  return (
    <form action={action} className="relative space-y-5" noValidate>
      <Honeypot />
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="full_name" label="Your name" required state={state} autoComplete="name" />
        <TextField name="business_name" label="Business name" required state={state} autoComplete="organization" />
        <TextField name="email" label="Email" type="email" required state={state} autoComplete="email" />
        <TextField name="phone" label="Phone" type="tel" required state={state} autoComplete="tel" />
      </div>
      <SelectField name="partner_type" label="What kind of business are you?" options={PARTNER_TYPES} required state={state} />
      <TextArea
        name="referral_plan"
        label="How do you plan to refer businesses?"
        hint="For example: tenants moving into spaces I lease, clients whose offices we move, buildings we maintain."
        required
        state={state}
      />
      <ConsentCheckbox name="agree_terms" state={state}>
        I agree to the{" "}
        <Link href="/terms/partner" target="_blank" className="font-medium text-brand-700 underline">
          partner terms
        </Link>
        , including: I will only refer businesses that agreed to be contacted; no spam or bulk messaging; no
        self-referrals; Something Clicks may reject or void referrals; and commission is paid only for completed
        walkthroughs.
      </ConsentCheckbox>
      <SubmitButton pendingText="Submitting…">Submit application</SubmitButton>
    </form>
  );
}
