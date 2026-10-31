"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

const styles = {
  primary: "bg-royal text-white hover:bg-navy",
  secondary: "bg-white text-royal ring-1 ring-inset ring-royal hover:bg-ice",
  quiet: "bg-white text-navy ring-1 ring-inset ring-line hover:bg-cloud",
};

/** Shows a pending label while its form submits, so a second tap doesn't send twice. */
export function SubmitButton({
  children,
  pendingLabel = "One moment…",
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { pendingLabel?: string; variant?: keyof typeof styles }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
      {...props}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
