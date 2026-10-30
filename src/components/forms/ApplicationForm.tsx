"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { submitApplication } from "@/app/(site)/actions";
import { Button } from "@/components/ui";
import {
  audienceSizes,
  categories,
  channels,
  collaborationInterests,
  commitOptions,
  contactMethods,
  pilotFitOptions,
  serviceAreas,
  teamSizes,
  timePerMonth,
  yearsInBusiness,
} from "@/content/options";
import { pilot } from "@/content/pilot";
import { consentCopy } from "@/content/site";
import { trackFormEvent } from "@/lib/attribution";
import {
  applicationStepFields,
  applicationSteps,
  formDataToInput,
  validate,
  validateApplication,
  type FieldErrors,
  type FormInput,
} from "@/lib/validation";
import { ChoiceGroup, ConsentCheckbox, ErrorSummary, FieldError, fieldId, Honeypot, SelectField, TextArea, TextField } from "./fields";
import { useFormController } from "./useFormController";

const DRAFT_KEY = "sc_application_draft";
const NOT_SAVED = new Set(["company_website", "consent_contact", "consent_updates", "form_started_at"]);

const firstStepWithError = (errors: FieldErrors) =>
  applicationSteps.findIndex((s) => applicationStepFields[s.id].some((f) => f in errors));

export function ApplicationForm() {
  const { errors, setErrors, showErrors, state, formError, pending, summaryRef, onInteract, send } = useFormController(
    submitApplication,
    "application",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [snap, setSnap] = useState<FormInput>({});
  const last = applicationSteps.length - 1;

  // Restore a draft from this browser session (never sent anywhere).
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as FormInput | null;
      if (saved) {
        for (const el of Array.from(form.elements) as HTMLInputElement[]) {
          if (!el.name || !(el.name in saved) || NOT_SAVED.has(el.name)) continue;
          const v = saved[el.name];
          if (el.type === "checkbox" || el.type === "radio") el.checked = ([] as string[]).concat(v).includes(el.value);
          else el.value = String(v);
        }
      }
    } catch {
      // Ignore unreadable drafts.
    }
    setSnap(formDataToInput(new FormData(form)));
  }, []);

  // When the server reports errors, go to the first step that has one.
  const [seenServer, setSeenServer] = useState<number>();
  if (state.submittedAt !== seenServer) {
    setSeenServer(state.submittedAt);
    const i = state.errors ? firstStepWithError(state.errors) : -1;
    if (i >= 0) setStep(i);
  }

  const onChange = () => {
    const form = formRef.current;
    if (!form) return;
    const input = formDataToInput(new FormData(form));
    setSnap(input);
    try {
      const draft = Object.fromEntries(Object.entries(input).filter(([k]) => !NOT_SAVED.has(k)));
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage full or blocked; the draft is a convenience only.
    }
  };

  const goTo = (i: number) => {
    setStep(i);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      formRef.current?.scrollIntoView({ block: "start" });
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = formDataToInput(new FormData(form));

    if (step < last) {
      const result = validate(applicationSteps[step].schema, input);
      if (!result.ok) return showErrors(result.errors);
      setErrors({});
      trackFormEvent("application", "form_step", step + 2);
      return goTo(step + 1);
    }

    const result = validateApplication(input);
    if (!result.ok) {
      const i = firstStepWithError(result.errors);
      if (i !== step) setStep(i);
      return showErrors(result.errors);
    }
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {}
    setErrors({});
    send(form);
  };

  const checked = (name: string, value: string) => ([] as string[]).concat(snap[name] ?? []).includes(value);
  const current = applicationSteps[step];

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={onSubmit}
      onChange={onChange}
      onFocus={onInteract}
      className="relative rounded-2xl bg-white p-5 ring-1 ring-line sm:p-8"
      aria-labelledby="step-heading"
    >
      <Progress step={step} />

      <h2 id="step-heading" ref={headingRef} tabIndex={-1} className="mt-8 text-2xl focus:outline-none">
        {current.title}
      </h2>
      <p className="mt-1 text-sm text-navy-soft">
        Fields marked <span className="text-danger">*</span> are required. Your answers are kept in this browser tab
        until you submit.
      </p>

      <div className="mt-6">
        <ErrorSummary ref={summaryRef} errors={errors} formError={formError} />
      </div>

      {/* Step 1: Business */}
      <div hidden={step !== 0} className="mt-6 space-y-6">
        <TextField name="business_name" label="Business name" required autoComplete="organization" errors={errors} />
        <TextField
          name="website"
          label="Website or main social link"
          hint="For example: yourbusiness.com or instagram.com/yourbusiness"
          required
          type="url"
          inputMode="url"
          autoComplete="url"
          maxLength={300}
          errors={errors}
        />
        <SelectField name="category" label="Business category" required options={categories} errors={errors} />
        <div hidden={snap.category !== "Other"}>
          <TextField name="category_other" label="Describe your category" required errors={errors} />
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField name="years_in_business" label="Years in business" required options={yearsInBusiness} errors={errors} />
          <SelectField name="team_size" label="Team size" required options={teamSizes} errors={errors} />
        </div>
        <ChoiceGroup
          name="service_areas"
          label="Where do you serve customers?"
          hint="Choose all that apply."
          required
          options={serviceAreas}
          columns={3}
          errors={errors}
        />
      </div>

      {/* Step 2: Customers */}
      <div hidden={step !== 1} className="mt-6 space-y-6">
        <TextArea name="ideal_customer" label="Describe your ideal customer" rows={3} required errors={errors} />
        <TextArea
          name="customer_needs"
          label="What situations or needs usually bring customers to you?"
          rows={3}
          required
          errors={errors}
        />
        <TextArea
          name="needs_before"
          label="What do customers usually need right before they buy from you?"
          hint="Think about the business they likely worked with just before you."
          rows={3}
          required
          errors={errors}
        />
        <TextArea
          name="needs_after"
          label="What do customers usually need right after they buy from you?"
          hint="Think about who they'll call next."
          rows={3}
          required
          errors={errors}
        />
        <p className="rounded-lg bg-ice p-4 text-sm">
          Please describe customers in general terms. We never ask for customer lists or any customer&rsquo;s personal
          information.
        </p>
      </div>

      {/* Step 3: Channels */}
      <div hidden={step !== 2} className="mt-6 space-y-6">
        <ChoiceGroup
          name="channels"
          label="How do you reach customers today?"
          hint="Choose all that apply, then pick an approximate audience size for each."
          required
          options={channels}
          errors={errors}
          renderExtra={(value) => {
            const name = `audience_${value}`;
            return (
              <div hidden={!checked("channels", value)} className="mt-3 pl-7">
                <label htmlFor={fieldId(name)} className="block text-sm font-medium">
                  Approximate audience size<span className="ml-0.5 text-danger" aria-hidden="true">*</span>
                </label>
                <select
                  id={fieldId(name)}
                  name={name}
                  defaultValue=""
                  aria-invalid={errors[name] ? true : undefined}
                  aria-describedby={errors[name] ? `${fieldId(name)}-error` : undefined}
                  className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm sm:w-64 ${
                    errors[name] ? "border-danger" : "border-field"
                  }`}
                >
                  <option value="" disabled>
                    Choose a range
                  </option>
                  {audienceSizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <FieldError name={name} error={errors[name]} />
              </div>
            );
          }}
        />
        <div hidden={!checked("channels", "other")}>
          <TextField name="channel_other" label="Describe the other channel" required errors={errors} />
        </div>
      </div>

      {/* Step 4: Partnerships and capacity */}
      <div hidden={step !== 3} className="mt-6 space-y-6">
        <TextArea
          name="current_referrals"
          label="Which businesses do you already refer customers to, or get referrals from?"
          hint="Business names or types are fine."
          rows={3}
          errors={errors}
        />
        <TextArea
          name="desired_partner_types"
          label="What types of businesses would you like to partner with?"
          rows={3}
          required
          errors={errors}
        />
        <ChoiceGroup
          name="collaboration_interests"
          label="What kinds of collaboration interest you?"
          hint="Choose all that apply."
          required
          options={collaborationInterests}
          columns={2}
          errors={errors}
        />
        <div hidden={!checked("collaboration_interests", "other")}>
          <TextField name="collaboration_other" label="Describe the other collaboration" required errors={errors} />
        </div>
        <TextArea
          name="past_experience"
          label="Have you cross-promoted with another business before? What worked or didn't?"
          rows={3}
          errors={errors}
        />
        <SelectField
          name="time_per_month"
          label="Realistically, how much time could you give a partnership each month?"
          required
          options={timePerMonth}
          errors={errors}
        />
        <ChoiceGroup
          name="commit_30_days"
          type="radio"
          label="Would you commit to one tracked collaboration in the next 30 days?"
          required
          options={commitOptions}
          columns={3}
          errors={errors}
        />
        <ChoiceGroup
          name="pilot_fit"
          type="radio"
          label={`Do your customers fit the founding pilot's ${pilot.shortName} journey?`}
          hint={pilot.summary}
          required
          options={pilotFitOptions}
          errors={errors}
        />
      </div>

      {/* Step 5: Contact and consent */}
      <div hidden={step !== 4} className="mt-6 space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="contact_name" label="Your name" required autoComplete="name" errors={errors} />
          <TextField name="contact_role" label="Your role" required autoComplete="organization-title" errors={errors} />
          <TextField name="email" label="Email" type="email" required autoComplete="email" errors={errors} />
          <TextField name="phone" label="Phone" type="tel" autoComplete="tel" errors={errors} />
        </div>
        <ChoiceGroup
          name="preferred_contact"
          type="radio"
          label="How would you prefer we contact you?"
          required
          options={contactMethods}
          columns={3}
          errors={errors}
        />
        <div className="space-y-4 rounded-xl bg-cloud p-5">
          <ConsentCheckbox name="consent_contact" required errors={errors}>
            I agree to be contacted by Something Clicks about this application, and I agree to the{" "}
            <Link href="/privacy" target="_blank" className="text-royal underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" target="_blank" className="text-royal underline">
              Terms
            </Link>
            .
          </ConsentCheckbox>
          <ConsentCheckbox name="consent_updates" errors={errors}>
            {consentCopy.updates}
          </ConsentCheckbox>
        </div>
        <p className="text-sm text-navy-soft">{consentCopy.noGuarantee}</p>
      </div>

      <Honeypot />

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
        {step > 0 ? (
          <Button type="button" variant="secondary" onClick={() => goTo(step - 1)}>
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back
          </Button>
        ) : (
          <span />
        )}
        {step < last ? (
          <Button type="submit">
            Continue <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit application"}
          </Button>
        )}
      </div>
      <noscript>
        <p className="mt-4 text-sm">This form needs JavaScript. Please enable it to continue.</p>
      </noscript>
    </form>
  );
}

function Progress({ step }: { step: number }) {
  const total = applicationSteps.length;
  return (
    <div>
      <p className="text-sm font-semibold text-royal" aria-live="polite">
        Step {step + 1} of {total}
      </p>
      <div className="mt-2 h-2 rounded-full bg-ice" aria-hidden="true">
        <div className="h-2 rounded-full bg-royal transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      <ol className="mt-4 hidden gap-2 text-sm sm:grid sm:grid-cols-5">
        {applicationSteps.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === step ? "step" : undefined}
            className={i === step ? "font-semibold text-navy" : i < step ? "text-navy-soft" : "text-navy-soft/80"}
          >
            <span className="sr-only">{i < step ? "Completed: " : i === step ? "Current: " : ""}</span>
            {s.title}
          </li>
        ))}
      </ol>
    </div>
  );
}
