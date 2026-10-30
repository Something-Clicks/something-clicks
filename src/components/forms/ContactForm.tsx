"use client";

import Link from "next/link";
import { submitContact } from "@/app/(site)/actions";
import { Button } from "@/components/ui";
import { contactTopics } from "@/content/options";
import { contactSchema, validate } from "@/lib/validation";
import { ConsentCheckbox, ErrorSummary, Honeypot, SelectField, TextArea, TextField } from "./fields";
import { useFormController } from "./useFormController";

const check = (input: Record<string, unknown>) => {
  const r = validate(contactSchema, input);
  return r.ok ? {} : r.errors;
};

export function ContactForm() {
  const { errors, formError, pending, summaryRef, onInteract, handleSubmit } = useFormController(submitContact, "contact");
  return (
    <form noValidate onSubmit={handleSubmit(check)} onFocus={onInteract} className="relative space-y-6">
      <p className="text-sm text-navy-soft">
        Fields marked <span className="text-danger">*</span> are required.
      </p>
      <ErrorSummary ref={summaryRef} errors={errors} formError={formError} />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField name="name" label="Your name" required autoComplete="name" errors={errors} />
        <TextField name="email" label="Email" type="email" required autoComplete="email" errors={errors} />
      </div>
      <SelectField name="topic" label="Topic" required options={contactTopics} errors={errors} />
      <TextArea name="message" label="Message" required rows={6} maxLength={5000} errors={errors} />
      <ConsentCheckbox name="consent_contact" required errors={errors}>
        I agree to be contacted by Something Clicks about this message, and I agree to the{" "}
        <Link href="/privacy" className="text-royal underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-royal underline">
          Terms
        </Link>
        .
      </ConsentCheckbox>
      <Honeypot />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send message"}
      </Button>
      <noscript>
        <p className="text-sm">This form needs JavaScript. You can also email us using the address on this page.</p>
      </noscript>
    </form>
  );
}
