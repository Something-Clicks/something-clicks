import type { FieldErrors } from "@/lib/validation";

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, unknown>;
};

export const initialFormState: FormState = { status: "idle" };
