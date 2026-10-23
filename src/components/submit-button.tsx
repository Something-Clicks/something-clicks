"use client";

import { useFormStatus } from "react-dom";

/**
 * While submitting, the button stays focusable (aria-disabled rather than disabled, so focus isn't
 * lost) but ignores further clicks and Enter-key submissions to prevent duplicates.
 */
export function SubmitButton({ children, pendingText, className = "btn" }: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (pending) e.preventDefault();
      }}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}
