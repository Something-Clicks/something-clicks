"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckboxGroup, ConsentCheckbox, FormMessage, RequiredNote, TextArea, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { useFormFocus } from "@/components/use-form-focus";
import { CLEANING_FREQUENCIES, PROPERTY_TYPES, SERVICE_AREAS, WEEKDAYS } from "@/lib/constants";
import { initialFormState } from "@/lib/forms";
import { saveBuyerProfile } from "./actions";

export type OnboardingDefaults = {
  company_name?: string;
  contact_name?: string;
  phone?: string;
  website?: string | null;
  service_areas?: string[];
  min_sq_ft?: number;
  property_types?: string[];
  cleaning_frequencies?: string[];
  notes?: string | null;
  availability_days?: string[];
  availability_start?: string;
  availability_end?: string;
};

export function OnboardingForm({ defaults, isNew }: { defaults: OnboardingDefaults; isNew: boolean }) {
  const [state, action] = useActionState(saveBuyerProfile, initialFormState);
  const { formRef } = useFormFocus(state);
  return (
    <form ref={formRef} action={action} className="space-y-8" noValidate>
      <FormMessage state={state} />
      <RequiredNote />
      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">Company</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="company_name" label="Company name" required state={state} defaultValue={defaults.company_name} />
          <TextField name="contact_name" label="Contact name" required state={state} defaultValue={defaults.contact_name} />
          <TextField name="phone" label="Phone" type="tel" required state={state} defaultValue={defaults.phone} />
          <TextField name="website" label="Website" state={state} defaultValue={defaults.website} />
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">Service area</legend>
        <CheckboxGroup
          name="service_areas"
          label="Cities you serve"
          options={SERVICE_AREAS.map((a) => ({ value: a, label: a }))}
          state={state}
          defaultValues={defaults.service_areas}
          columns="sm:grid-cols-3"
        />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">What you clean</legend>
        <TextField
          name="min_sq_ft"
          label="Minimum square feet"
          type="number"
          required
          hint="Enter 0 if you have no minimum."
          state={state}
          defaultValue={defaults.min_sq_ft ?? 0}
        />
        <CheckboxGroup
          name="property_types"
          label="Property types"
          options={PROPERTY_TYPES}
          state={state}
          defaultValues={defaults.property_types}
        />
        <CheckboxGroup
          name="cleaning_frequencies"
          label="Cleaning frequencies you take on"
          options={CLEANING_FREQUENCIES}
          state={state}
          defaultValues={defaults.cleaning_frequencies}
        />
        <TextArea name="notes" label="Other requirements" rows={3} state={state} defaultValue={defaults.notes} />
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold">When you can do walkthroughs</legend>
        <CheckboxGroup
          name="availability_days"
          label="Days"
          options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
          state={state}
          defaultValues={defaults.availability_days ?? ["1", "2", "3", "4", "5"]}
          columns="sm:grid-cols-4"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            name="availability_start"
            label="From"
            type="time"
            required
            state={state}
            defaultValue={defaults.availability_start ?? "09:00"}
          />
          <TextField
            name="availability_end"
            label="Until"
            type="time"
            required
            state={state}
            defaultValue={defaults.availability_end ?? "16:00"}
          />
        </div>
      </fieldset>

      {isNew ? (
        <ConsentCheckbox name="agree_terms" state={state}>
          I agree to the{" "}
          <Link href="/terms/buyer" target="_blank" className="font-medium text-brand-700 underline">
            buyer terms
          </Link>{" "}
          on behalf of my company.
        </ConsentCheckbox>
      ) : null}

      <SubmitButton pendingText="Saving…" className="btn btn-lg">{isNew ? "Submit for review" : "Save changes"}</SubmitButton>
    </form>
  );
}
