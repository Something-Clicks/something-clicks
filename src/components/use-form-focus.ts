"use client";

import { useEffect, useRef } from "react";
import type { FormState } from "@/lib/forms";

/**
 * Moves keyboard focus after a form action returns, so screen-reader and keyboard users aren't left
 * at the top of the page: to the first invalid field (or the error message) on error, and to the
 * result on success. Runs once per submission because each action returns a new state object.
 */
export function useFormFocus(state: FormState) {
  const formRef = useRef<HTMLFormElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status === "error") {
      const form = formRef.current;
      const target =
        form?.querySelector<HTMLElement>('[aria-invalid="true"], fieldset[data-invalid] input') ??
        form?.querySelector<HTMLElement>("[data-form-message]");
      target?.focus();
    } else if (state.status === "success") {
      resultRef.current?.focus();
    }
  }, [state]);

  return { formRef, resultRef };
}
