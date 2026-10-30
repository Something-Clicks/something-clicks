import type { ComponentProps, ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

export const inputClass =
  "mt-1.5 block w-full rounded-lg border border-field bg-white px-3.5 py-2.5 text-base text-navy placeholder:text-navy-soft/70 focus:border-royal focus-visible:outline-royal";

/** A labelled input for the plain server-action forms in the claim flow and dashboard. */
export function Field({
  label,
  hint,
  optional,
  name,
  textarea,
  ...props
}: { label: ReactNode; hint?: ReactNode; optional?: boolean; name: string; textarea?: boolean } & ComponentProps<"input"> &
  Pick<ComponentProps<"textarea">, "rows">) {
  const id = `f-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="block font-medium">
        {label}
        {optional && <span className="ml-1 text-sm font-normal text-navy-soft">(optional)</span>}
      </label>
      {hint && <p id={hintId} className="mt-1 text-sm text-navy-soft">{hint}</p>}
      {textarea ? (
        <textarea
          id={id}
          name={name}
          aria-describedby={hintId}
          required={props.required}
          maxLength={props.maxLength}
          defaultValue={props.defaultValue as string}
          rows={props.rows ?? 3}
          placeholder={props.placeholder}
          className={inputClass}
        />
      ) : (
        <input id={id} name={name} aria-describedby={hintId} className={inputClass} {...props} />
      )}
    </div>
  );
}

export function Notice({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  if (tone === "error") {
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-[#FDECEC] p-4 font-medium text-danger">
        <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{children}</span>
      </p>
    );
  }
  return (
    <p role="status" className={`flex items-start gap-2 rounded-xl p-4 ${tone === "success" ? "bg-[#E8F7EE]" : "bg-ice"}`}>
      {tone === "success" && <CircleCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-success" />}
      <span>{children}</span>
    </p>
  );
}
