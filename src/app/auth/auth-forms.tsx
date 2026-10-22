"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, TextField } from "@/components/form-fields";
import { SubmitButton } from "@/components/submit-button";
import { initialFormState } from "@/lib/forms";
import { signIn, signUpBuyer } from "./actions";

export function SignUpForm() {
  const [state, action] = useActionState(signUpBuyer, initialFormState);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />
      <TextField name="email" label="Work email" type="email" required state={state} autoComplete="email" />
      <TextField
        name="password"
        label="Password"
        type="password"
        required
        state={state}
        autoComplete="new-password"
        hint="At least 10 characters."
      />
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, initialFormState);
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField name="email" label="Email" type="email" required state={state} autoComplete="email" />
      <TextField name="password" label="Password" type="password" required state={state} autoComplete="current-password" />
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
      <p className="text-sm text-zinc-600">
        Cleaning company without an account?{" "}
        <Link href="/signup" className="font-medium text-brand-700 underline">
          Create one
        </Link>
      </p>
    </form>
  );
}
