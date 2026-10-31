"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    promotekit_referral?: string;
  }
}

/**
 * Hidden field with the PromoteKit referral the visitor arrived with, filled
 * in just before the form submits (the tracking script loads asynchronously).
 */
export function ReferralInput() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = ref.current;
    const form = input?.form;
    if (!input || !form) return;
    const fill = () => {
      input.value = typeof window.promotekit_referral === "string" ? window.promotekit_referral : "";
    };
    fill();
    form.addEventListener("submit", fill);
    return () => form.removeEventListener("submit", fill);
  }, []);
  return <input ref={ref} type="hidden" name="referral" defaultValue="" />;
}
