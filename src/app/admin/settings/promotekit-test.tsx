"use client";

import { useActionState } from "react";
import { checkPromoteKitConnection } from "@/app/admin/actions";
import { SubmitButton } from "@/components/submit-button";
import type { PromoteKitConnectionResult } from "@/lib/promotekit";

export function promoteKitResultMessage(result: PromoteKitConnectionResult): { tone: "ok" | "warn"; text: string } {
  switch (result.status) {
    case "connected":
      return { tone: "ok", text: "Connected. PromoteKit accepted the API key." };
    case "unauthorized":
      return { tone: "warn", text: "401: PromoteKit rejected the API key. Check PROMOTEKIT_API_KEY." };
    case "forbidden":
      return { tone: "warn", text: "403: The PromoteKit account has no active or trialing plan, so the API isn't available." };
    case "unreachable":
      return { tone: "warn", text: "Couldn't reach PromoteKit (network error or timeout)." };
    case "not_configured":
      return { tone: "warn", text: "PROMOTEKIT_API_KEY isn't set in this environment." };
    case "unexpected":
      return { tone: "warn", text: `PromoteKit responded with an unexpected status (${result.httpStatus}).` };
  }
}

export function PromoteKitTest() {
  const [result, action] = useActionState(checkPromoteKitConnection, null);
  const message = result ? promoteKitResultMessage(result) : null;

  return (
    <section className="card mt-8 space-y-3" aria-labelledby="promotekit-test">
      <h2 id="promotekit-test" className="font-semibold">
        PromoteKit connection
      </h2>
      <p className="text-sm text-zinc-600">
        Makes one read-only request (list affiliates) using PROMOTEKIT_API_KEY. Nothing is created, and the partner
        integration stays off.
      </p>
      <form action={action}>
        <SubmitButton pendingText="Testing…" className="btn-secondary">
          Test PromoteKit connection
        </SubmitButton>
      </form>
      <div role="status" aria-live="polite">
        {message ? (
          <p className={`text-sm ${message.tone === "ok" ? "text-brand-700" : "text-red-700"}`}>{message.text}</p>
        ) : null}
      </div>
    </section>
  );
}
