"use client";

import { forwardRef, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import type { FieldErrors } from "@/lib/validation";

type Option = string | { value: string; label: string };
const optValue = (o: Option) => (typeof o === "string" ? o : o.value);
const optLabel = (o: Option) => (typeof o === "string" ? o : o.label);

export const fieldId = (name: string) => `f-${name}`;

const describedBy = (name: string, hint?: ReactNode, error?: string) =>
  [hint ? `${fieldId(name)}-hint` : "", error ? `${fieldId(name)}-error` : ""].filter(Boolean).join(" ") || undefined;

const inputBase =
  "mt-1.5 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-base text-navy shadow-xs placeholder:text-navy-soft/70 focus:border-royal focus-visible:outline-royal";
const inputBorder = (error?: string) => (error ? "border-danger" : "border-field");

function Label({ name, children, required }: { name: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={fieldId(name)} className="block font-medium text-navy">
      {children}
      {required ? <RequiredMark /> : <span className="ml-1 text-sm font-normal text-navy-soft">(optional)</span>}
    </label>
  );
}

function RequiredMark() {
  return (
    <span className="ml-0.5 text-danger" aria-hidden="true">
      *
    </span>
  );
}

function Hint({ name, children }: { name: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={`${fieldId(name)}-hint`} className="mt-1 text-sm text-navy-soft">
      {children}
    </p>
  );
}

export function FieldError({ name, error }: { name: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={`${fieldId(name)}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger">
      <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      {error}
    </p>
  );
}

type Common = { name: string; label: ReactNode; hint?: ReactNode; required?: boolean; errors: FieldErrors };

export function TextField({
  name,
  label,
  hint,
  required,
  errors,
  type = "text",
  autoComplete,
  maxLength = 200,
  inputMode,
}: Common & {
  type?: "text" | "email" | "tel" | "url";
  autoComplete?: string;
  maxLength?: number;
  inputMode?: "text" | "email" | "tel" | "url";
}) {
  const error = errors[name];
  return (
    <div>
      <Label name={name} required={required}>
        {label}
      </Label>
      <Hint name={name}>{hint}</Hint>
      <input
        id={fieldId(name)}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`${inputBase} ${inputBorder(error)}`}
      />
      <FieldError name={name} error={error} />
    </div>
  );
}

export function TextArea({ name, label, hint, required, errors, rows = 4, maxLength = 2000 }: Common & { rows?: number; maxLength?: number }) {
  const error = errors[name];
  return (
    <div>
      <Label name={name} required={required}>
        {label}
      </Label>
      <Hint name={name}>{hint}</Hint>
      <textarea
        id={fieldId(name)}
        name={name}
        rows={rows}
        maxLength={maxLength}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        className={`${inputBase} ${inputBorder(error)}`}
      />
      <FieldError name={name} error={error} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  hint,
  required,
  errors,
  options,
  placeholder = "Choose one",
}: Common & { options: readonly Option[]; placeholder?: string }) {
  const error = errors[name];
  return (
    <div>
      <Label name={name} required={required}>
        {label}
      </Label>
      <Hint name={name}>{hint}</Hint>
      <select
        id={fieldId(name)}
        name={name}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, hint, error)}
        defaultValue=""
        className={`${inputBase} ${inputBorder(error)}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={optValue(o)} value={optValue(o)}>
            {optLabel(o)}
          </option>
        ))}
      </select>
      <FieldError name={name} error={error} />
    </div>
  );
}

/** Checkbox or radio group in a fieldset with a legend. */
export function ChoiceGroup({
  name,
  label,
  hint,
  required,
  errors,
  options,
  type = "checkbox",
  columns = 1,
  renderExtra,
}: Common & {
  options: readonly Option[];
  type?: "checkbox" | "radio";
  columns?: 1 | 2 | 3;
  renderExtra?: (value: string) => ReactNode;
}) {
  const error = errors[name];
  const cols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3" }[columns];
  return (
    <fieldset
      id={fieldId(name)}
      aria-describedby={describedBy(name, hint, error)}
      aria-invalid={error ? true : undefined}
      aria-required={required && type === "radio" ? true : undefined}
    >
      <legend className="font-medium text-navy">
        {label}
        {required ? <RequiredMark /> : <span className="ml-1 text-sm font-normal text-navy-soft">(optional)</span>}
      </legend>
      <Hint name={name}>{hint}</Hint>
      <div className={`mt-2 grid gap-2 ${cols}`}>
        {options.map((o) => {
          const value = optValue(o);
          const id = `${fieldId(name)}-${value.replace(/[^a-zA-Z0-9]+/g, "-")}`;
          return (
            <div
              key={value}
              className={`rounded-lg border bg-white px-3.5 py-2.5 has-checked:border-royal has-checked:bg-ice ${
                error ? "border-danger" : "border-field"
              }`}
            >
              <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
                <input
                  id={id}
                  type={type}
                  name={name}
                  value={value}
                  className="mt-1 h-4 w-4 shrink-0 accent-royal"
                />
                <span>{optLabel(o)}</span>
              </label>
              {renderExtra?.(value)}
            </div>
          );
        })}
      </div>
      <FieldError name={name} error={error} />
    </fieldset>
  );
}

export function ConsentCheckbox({
  name,
  children,
  required,
  errors,
}: {
  name: string;
  children: ReactNode;
  required?: boolean;
  errors: FieldErrors;
}) {
  const error = errors[name];
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={fieldId(name)}
          type="checkbox"
          name={name}
          required={required}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId(name)}-error` : undefined}
          className="mt-1 h-4 w-4 shrink-0 accent-royal"
        />
        <label htmlFor={fieldId(name)} className="text-sm text-navy">
          {children}
          {required ? <RequiredMark /> : <span className="ml-1 text-navy-soft">(optional)</span>}
        </label>
      </div>
      <FieldError name={name} error={error} />
    </div>
  );
}

/** Visually hidden field that only bots fill in. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <label htmlFor="company_website">Leave this field empty</label>
      <input id="company_website" name="company_website" type="text" tabIndex={-1} autoComplete="off" />
    </div>
  );
}

export const ErrorSummary = forwardRef<HTMLDivElement, { errors: FieldErrors; formError?: string }>(function ErrorSummary(
  { errors, formError },
  ref,
) {
  const entries = Object.entries(errors);
  if (!formError && entries.length === 0) return null;
  const focusField = (name: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(fieldId(name));
    const target = el?.matches("input,select,textarea") ? el : el?.querySelector<HTMLElement>("input,select,textarea");
    target?.focus();
    el?.scrollIntoView({ block: "center" });
  };
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      className="rounded-xl border-2 border-danger bg-white p-4 text-navy focus:outline-none"
    >
      <p className="flex items-center gap-2 font-semibold text-danger">
        <CircleAlert aria-hidden="true" className="h-5 w-5" />
        {formError ?? "Please fix the highlighted fields."}
      </p>
      {entries.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-6 text-sm">
          {entries.map(([name, message]) => (
            <li key={name}>
              <a href={`#${fieldId(name)}`} onClick={focusField(name)} className="text-danger underline">
                {message}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
