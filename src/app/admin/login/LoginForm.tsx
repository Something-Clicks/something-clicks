"use client";

import { useActionState } from "react";
import { requestLoginLink, type LoginState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(requestLoginLink, {} as LoginState);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1.5 block w-full rounded-lg border border-field px-3.5 py-2.5"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="rounded-lg bg-ice p-3 text-sm">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-navy px-4 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
