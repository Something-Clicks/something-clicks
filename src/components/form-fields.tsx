import type { FormState } from "@/lib/forms";

type Option = { value: string; label: string };

function Error({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1 text-sm text-red-700">
      {message}
    </p>
  ) : null;
}

/** ids of the hint and error text, for aria-describedby. */
function describedBy(name: string, hint: string | undefined, state: FormState | undefined) {
  const ids = [hint ? `${name}-hint` : null, state?.fieldErrors?.[name] ? `${name}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

const val = (state: FormState | undefined, name: string) => {
  const v = state?.values?.[name];
  return typeof v === "string" ? v : undefined;
};

const vals = (state: FormState | undefined, name: string): string[] | undefined => {
  const v = state?.values?.[name];
  return Array.isArray(v) ? (v as string[]) : undefined;
};

export function TextField(props: {
  name: string;
  label: string;
  state?: FormState;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: string | number | null;
  autoComplete?: string;
  step?: string;
}) {
  const { name, label, state, type = "text", required, placeholder, hint, defaultValue, autoComplete, step } = props;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        step={step}
        defaultValue={val(state, name) ?? defaultValue ?? undefined}
        className="input mt-1"
        aria-invalid={Boolean(state?.fieldErrors?.[name])}
        aria-describedby={describedBy(name, hint, state)}
      />
      {hint ? <p id={`${name}-hint`} className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <Error id={`${name}-error`} message={state?.fieldErrors?.[name]} />
    </div>
  );
}

export function TextArea(props: {
  name: string;
  label: string;
  state?: FormState;
  required?: boolean;
  rows?: number;
  hint?: string;
  defaultValue?: string | null;
}) {
  const { name, label, state, required, rows = 4, hint, defaultValue } = props;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        defaultValue={val(state, name) ?? defaultValue ?? undefined}
        className="input mt-1"
        aria-invalid={Boolean(state?.fieldErrors?.[name])}
        aria-describedby={describedBy(name, hint, state)}
      />
      {hint ? <p id={`${name}-hint`} className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <Error id={`${name}-error`} message={state?.fieldErrors?.[name]} />
    </div>
  );
}

export function SelectField(props: {
  name: string;
  label: string;
  options: readonly Option[];
  state?: FormState;
  required?: boolean;
  defaultValue?: string | null;
}) {
  const { name, label, options, state, required, defaultValue } = props;
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={val(state, name) ?? defaultValue ?? ""}
        className="input mt-1"
        aria-invalid={Boolean(state?.fieldErrors?.[name])}
        aria-describedby={describedBy(name, undefined, state)}
      >
        <option value="" disabled>
          Choose one
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Error id={`${name}-error`} message={state?.fieldErrors?.[name]} />
    </div>
  );
}

export function CheckboxGroup(props: {
  name: string;
  label: string;
  options: readonly Option[];
  state?: FormState;
  defaultValues?: string[];
  columns?: string;
}) {
  const { name, label, options, state, defaultValues = [], columns = "sm:grid-cols-2" } = props;
  const selected = new Set(vals(state, name) ?? defaultValues);
  const error = state?.fieldErrors?.[name];
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined} data-invalid={error ? "true" : undefined}>
      <legend className="block text-sm font-medium text-zinc-800">{label}</legend>
      <div className={`mt-2 grid grid-cols-1 gap-2 ${columns}`}>
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={selected.has(o.value)}
              className="h-5 w-5 rounded border-zinc-300"
            />
            {o.label}
          </label>
        ))}
      </div>
      <Error id={`${name}-error`} message={state?.fieldErrors?.[name]} />
    </fieldset>
  );
}

export function ConsentCheckbox(props: { name: string; state?: FormState; children: React.ReactNode }) {
  const { name, state, children } = props;
  return (
    <div>
      <label className="flex items-start gap-3 text-sm text-zinc-800">
        <input
          type="checkbox"
          name={name}
          required
          defaultChecked={val(state, name) === "on"}
          className="mt-0.5 h-6 w-6 shrink-0 rounded border-zinc-300"
          aria-invalid={Boolean(state?.fieldErrors?.[name])}
          aria-describedby={describedBy(name, undefined, state)}
        />
        <span>{children}</span>
      </label>
      <Error id={`${name}-error`} message={state?.fieldErrors?.[name]} />
    </div>
  );
}

export function FormMessage({ state, ref }: { state: FormState; ref?: React.Ref<HTMLDivElement> }) {
  if (state.status === "error" && state.message) {
    return (
      <div
        ref={ref}
        role="alert"
        tabIndex={-1}
        data-form-message=""
        className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
      >
        {state.message}
      </div>
    );
  }
  if (state.status === "success" && state.message) {
    return (
      <div
        ref={ref}
        role="status"
        tabIndex={-1}
        data-form-message=""
        className="rounded-md border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900"
      >
        {state.message}
      </div>
    );
  }
  return null;
}

export function RequiredNote() {
  return (
    <p className="text-sm text-zinc-500">
      Fields marked <span className="text-red-600">*</span> are required.
    </p>
  );
}

/** Honeypot field: hidden from people, often filled in by bots. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
