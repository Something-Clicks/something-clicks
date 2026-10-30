"use client";

import Link from "next/link";
import { submitReferral } from "@/app/(site)/actions";
import { Button } from "@/components/ui";
import { referralSchema, validate } from "@/lib/validation";
import { ConsentCheckbox, ErrorSummary, Honeypot, TextArea, TextField } from "./fields";
import { useFormController } from "./useFormController";

const check = (input: Record<string, unknown>) => {
  const r = validate(referralSchema, input);
  return r.ok ? {} : r.errors;
};

export function ReferralForm() {
  const { errors, formError, pending, summaryRef, onInteract, handleSubmit } = useFormController(submitReferral, "referral");
  return (
    <form
      noValidate
      onSubmit={handleSubmit(check)}
      onFocus={onInteract}
      className="relative space-y-6 rounded-2xl bg-cloud p-6 sm:p-8"
      aria-describedby="referral-required-note"
    >
      <p id="referral-required-note" className="text-sm text-navy-soft">
        Fields marked <span className="text-danger">*</span> are required.
      </p>
      <ErrorSummary ref={summaryRef} errors={errors} formError={formError} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField name="name" label="Your name" required autoComplete="name" errors={errors} />
        <TextField name="organization" label="Organization" required autoComplete="organization" errors={errors} />
        <TextField name="role" label="Your role" required autoComplete="organization-title" errors={errors} />
        <TextField name="email" label="Email" type="email" required autoComplete="email" errors={errors} />
        <TextField name="phone" label="Phone" type="tel" autoComplete="tel" errors={errors} />
      </div>
      <TextArea
        name="business_types"
        label="What types of businesses could you introduce?"
        hint="For example: new commercial tenants, office furniture installers, maintenance vendors."
        required
        rows={3}
        errors={errors}
      />
      <TextArea
        name="connection"
        label="How are you connected to those businesses?"
        hint="For example: I manage the buildings they lease, or they're my clients."
        required
        rows={3}
        errors={errors}
      />
      <TextArea name="notes" label="Anything else we should know?" rows={3} errors={errors} />
      <ConsentCheckbox name="consent_contact" required errors={errors}>
        I agree to be contacted by Something Clicks about this submission, and I agree to the{" "}
        <Link href="/privacy" className="text-royal underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-royal underline">
          Terms
        </Link>
        .
      </ConsentCheckbox>
      <p className="text-sm text-navy-soft">
        Rewards for introductions are possible only where permitted and by individual written agreement. Nothing is
        promised by submitting this form.
      </p>
      <Honeypot />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send"}
      </Button>
      <noscript>
        <p className="text-sm">This form needs JavaScript. You can also email us using the address in the footer.</p>
      </noscript>
    </form>
  );
}
