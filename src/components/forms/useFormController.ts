"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/(site)/actions";
import { getAttribution, trackFormEvent, type TrackedForm } from "@/lib/attribution";
import { formDataToInput, type FieldErrors, type FormInput } from "@/lib/validation";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Shared behavior for every form: client-side validation before sending,
 * server errors after, focus on the error summary, attribution and timing
 * fields added at submit, and a one-time form_start event.
 *
 * Forms submit through onSubmit (not the `action` prop) so React does not
 * reset the fields when the server returns validation errors.
 */
export function useFormController(action: Action, form: TrackedForm) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const summaryRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  const tracked = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Adopt server results when a new one arrives.
  const [seen, setSeen] = useState<number>();
  if (state.submittedAt !== seen) {
    setSeen(state.submittedAt);
    setErrors(state.errors ?? {});
    setFormError(state.formError);
  }

  useEffect(() => {
    if (state.submittedAt) summaryRef.current?.focus();
  }, [state.submittedAt]);

  const onInteract = () => {
    if (tracked.current) return;
    tracked.current = true;
    trackFormEvent(form, "form_start");
  };

  const showErrors = (next: FieldErrors, message = "Please fix the highlighted fields.") => {
    setErrors(next);
    setFormError(Object.keys(next).length ? message : undefined);
    requestAnimationFrame(() => summaryRef.current?.focus());
  };

  const send = (formEl: HTMLFormElement) => {
    const formData = new FormData(formEl);
    for (const [k, v] of Object.entries(getAttribution())) formData.set(k, v);
    formData.set("form_started_at", String(startedAt.current));
    setFormError(undefined);
    startTransition(() => dispatch(formData));
  };

  /** Validate with `check`; send if clean. */
  const handleSubmit =
    (check: (input: FormInput) => FieldErrors) => (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formEl = e.currentTarget;
      const found = check(formDataToInput(new FormData(formEl)));
      if (Object.keys(found).length) return showErrors(found);
      setErrors({});
      send(formEl);
    };

  return { errors, setErrors, formError, pending, summaryRef, onInteract, showErrors, send, handleSubmit, state };
}
