"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notifyOwner } from "@/lib/email";
import { clientIp, hashIp, readAttribution } from "@/lib/request";
import { getStore, type Kind } from "@/lib/store";
import { handleSubmission } from "@/lib/submissions";
import { formDataToInput, type FieldErrors } from "@/lib/validation";

export type FormState = { errors?: FieldErrors; formError?: string; submittedAt?: number };

const thanksPath: Record<Kind, string> = {
  applications: "/join/thanks",
  referrals: "/referral-partners/thanks",
  contacts: "/contact/thanks",
};

async function submit(kind: Kind, formData: FormData): Promise<FormState> {
  const input = formDataToInput(formData);
  const ipHash = await hashIp(clientIp(await headers()));
  const result = await handleSubmission(
    kind,
    input,
    { ipHash, attribution: readAttribution(input) },
    { store: getStore(), notify: notifyOwner },
  );

  switch (result.status) {
    case "ok":
      redirect(thanksPath[kind]);
    case "invalid":
      return { errors: result.errors, formError: "Please fix the highlighted fields.", submittedAt: Date.now() };
    case "rate_limited":
      return {
        formError: "We've received several submissions from your connection recently. Please try again in an hour, or email us.",
        submittedAt: Date.now(),
      };
    default:
      return {
        formError: "Something went wrong on our side and your submission wasn't saved. Please try again in a few minutes.",
        submittedAt: Date.now(),
      };
  }
}

export async function submitApplication(_prev: FormState, formData: FormData) {
  return submit("applications", formData);
}

export async function submitReferral(_prev: FormState, formData: FormData) {
  return submit("referrals", formData);
}

export async function submitContact(_prev: FormState, formData: FormData) {
  return submit("contacts", formData);
}
