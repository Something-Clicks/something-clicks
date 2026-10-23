"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors, formToObject, signupSchema } from "@/lib/validation";

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signUpBuyer(_prev: FormState, form: FormData): Promise<FormState> {
  const raw = formToObject(form);
  const parsed = signupSchema.safeParse(raw);
  const values = { email: raw.email };
  if (!parsed.success) {
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error), values };
  }
  if (!isSupabaseConfigured()) return { status: "error", message: "Sign-up isn't open yet.", values };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { signup_as: "buyer" },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { status: "error", message: error.message, values };

  if (data.session) redirect("/onboarding");
  return {
    status: "success",
    message: "Check your email for a link to confirm your account, then continue setting up your company.",
  };
}

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) {
    const fieldErrors: Record<string, string> = {};
    if (!email) fieldErrors.email = "Enter your email";
    if (!password) fieldErrors.password = "Enter your password";
    return { status: "error", message: "Enter your email and password.", fieldErrors, values: { email } };
  }
  if (!isSupabaseConfigured()) return { status: "error", message: "Sign-in isn't available yet.", values: { email } };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { status: "error", message: "That email and password don't match.", values: { email } };
  redirect(safeNext(form.get("next")));
}
