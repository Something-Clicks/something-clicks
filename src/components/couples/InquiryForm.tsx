"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { CircleCheck } from "lucide-react";
import { Honeypot } from "@/components/forms/fields";
import { inputClass } from "@/components/members/fields";
import { sendInquiryAction, type InquiryState } from "@/app/(site)/vendors/actions";

/**
 * A couple's inquiry to one vendor. Spam protection: a hidden field bots fill
 * in, a minimum fill time (form_started_at), and rate limits on the server.
 */
export function InquiryForm({
  slug,
  vendorName,
  via,
  src,
  date,
  budgets,
  after,
}: {
  slug: string;
  vendorName: string;
  via?: string;
  src?: string;
  date?: string;
  budgets: readonly string[];
  /** Shown once the inquiry is sent (e.g. who this vendor works well with). */
  after?: ReactNode;
}) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiryAction, { status: "idle" });
  // When the form first appeared (spam check). Kept outside the form so it survives the remount below.
  const startedAt = useRef(0);
  useEffect(() => {
    if (!startedAt.current) startedAt.current = Date.now();
  }, []);
  const submit = (fd: FormData) => {
    fd.set("form_started_at", String(startedAt.current));
    action(fd);
  };

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-2xl bg-white p-6 ring-1 ring-line">
        <p className="flex items-start gap-2 text-lg font-semibold">
          <CircleCheck aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-success" />
          Sent. {state.vendorName} will reply by email.
        </p>
        <p className="mt-2 text-navy-soft">We&rsquo;ve emailed you a copy. Your details go only to {state.vendorName}.</p>
        {after}
      </div>
    );
  }

  const err = state.status === "error" ? state.errors ?? {} : {};
  const v = state.status === "error" ? state.values ?? {} : {};
  const field = (name: string, label: string, props: React.ComponentProps<"input"> = {}, optional = false) => (
    <div>
      <label htmlFor={`q-${name}`} className="block font-medium">
        {label}
        {optional && <span className="ml-1 text-sm font-normal text-navy-soft">(optional)</span>}
      </label>
      <input id={`q-${name}`} name={name} defaultValue={v[name] ?? (props.defaultValue as string)} aria-invalid={err[name] ? true : undefined}
             aria-describedby={err[name] ? `q-${name}-err` : undefined} className={inputClass} {...props} />
      {err[name] && <p id={`q-${name}-err`} className="mt-1 text-sm font-medium text-danger">{err[name]}</p>}
    </div>
  );

  return (
    // Remounted after an error so every field, including the select, shows what the couple typed
    // (React resets a form after its action runs).
    <form key={state.status === "error" ? JSON.stringify(v) : "new"} action={submit} className="relative space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8" noValidate>
      <h2 className="text-2xl">Send {vendorName} an inquiry</h2>
      {state.status === "error" && state.message && <p role="alert" className="rounded-xl bg-[#FDECEC] p-4 font-medium text-danger">{state.message}</p>}
      <input type="hidden" name="slug" value={slug} />
      {via && <input type="hidden" name="via" value={via} />}
      {src && <input type="hidden" name="src" value={src} />}
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        {field("name", "Your name", { required: true, maxLength: 120, autoComplete: "name" })}
        {field("email", "Email", { type: "email", required: true, maxLength: 254, autoComplete: "email" })}
        {field("phone", "Phone", { type: "tel", maxLength: 40, autoComplete: "tel" }, true)}
        {field("wedding_date", "Wedding date", { type: "date", defaultValue: date }, true)}
        {field("location", "City or venue", { maxLength: 200 }, true)}
        {field("guest_count", "Guest count", { inputMode: "numeric", maxLength: 5 }, true)}
      </div>
      <div>
        <label htmlFor="q-budget" className="block font-medium">Budget for this service <span className="ml-1 text-sm font-normal text-navy-soft">(optional)</span></label>
        <select id="q-budget" name="budget" defaultValue={v.budget ?? ""} className={inputClass}>
          <option value="">Choose a range</option>
          {budgets.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        {err.budget && <p className="mt-1 text-sm font-medium text-danger">{err.budget}</p>}
      </div>
      <div>
        <label htmlFor="q-message" className="block font-medium">Message</label>
        <textarea id="q-message" name="message" required maxLength={2000} rows={5} defaultValue={v.message ?? ""} className={inputClass}
                  aria-invalid={err.message ? true : undefined} aria-describedby={err.message ? "q-message-err" : undefined}
                  placeholder="Tell them about your wedding and what you're looking for." />
        {err.message && <p id="q-message-err" className="mt-1 text-sm font-medium text-danger">{err.message}</p>}
      </div>
      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="consent" required defaultChecked={v.consent === "on"} className="mt-1 h-5 w-5 accent-royal"
                 aria-invalid={err.consent ? true : undefined} aria-describedby={err.consent ? "q-consent-err" : undefined} />
          <span className="text-sm">
            I agree that Something Clicks sends my details to {vendorName} so they can reply, and I agree to the{" "}
            <a href="/privacy" className="font-semibold text-navy underline underline-offset-2">Privacy Policy</a> and{" "}
            <a href="/terms" className="font-semibold text-navy underline underline-offset-2">Terms</a>.
          </span>
        </label>
        {err.consent && <p id="q-consent-err" className="mt-1 text-sm font-medium text-danger">{err.consent}</p>}
      </div>
      <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center rounded-xl bg-navy px-5 py-3 font-semibold text-white hover:bg-navy/90 disabled:opacity-60 sm:w-auto">
        {pending ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}
