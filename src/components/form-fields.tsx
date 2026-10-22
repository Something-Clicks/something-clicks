import type { FormState } from "@/lib/forms";

type Option = { value: string; label: string };

function Error({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-sm text-red-700">{message}</p> : null;
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
      />
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <Error message={state?.fieldErrors?.[name]} />
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
      />
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <Error message={state?.fieldErrors?.[name]} />
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
      <Error message={state?.fieldErrors?.[name]} />
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
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-zinc-800">{label}</legend>
      <div className={`mt-2 grid grid-cols-1 gap-2 ${columns}`}>
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={selected.has(o.value)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            {o.label}
          </label>
        ))}
      </div>
      <Error message={state?.fieldErrors?.[name]} />
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
          className="mt-1 h-4 w-4 shrink-0 rounded border-zinc-300"
        />
        <span>{children}</span>
      </label>
      <Error message={state?.fieldErrors?.[name]} />
    </div>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "error" && state.message) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</div>;
  }
  if (state.status === "success" && state.message) {
    return (
      <div className="rounded-md border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">{state.message}</div>
    );
  }
  return null;
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
