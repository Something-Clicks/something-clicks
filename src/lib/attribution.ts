"use client";

const KEY = "sc_attribution";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

type Stored = Partial<Record<(typeof UTM_KEYS)[number] | "referrer", string>>;

function read(): Stored {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}

/**
 * First-touch attribution for the visit: UTM tags from the landing URL and the
 * external referrer. Kept in sessionStorage only (no cookies).
 */
export function captureAttribution() {
  try {
    if (sessionStorage.getItem(KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const stored: Stored = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) stored[k] = v.slice(0, 200);
    }
    const ref = document.referrer;
    if (ref && new URL(ref).origin !== window.location.origin) stored.referrer = ref.slice(0, 500);
    sessionStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // Storage unavailable (private mode, blocked): attribution is optional.
  }
}

export function getAttribution(): Record<string, string> {
  const stored = read();
  return {
    source_page: window.location.pathname,
    referrer: stored.referrer ?? "",
    utm_source: stored.utm_source ?? "",
    utm_medium: stored.utm_medium ?? "",
    utm_campaign: stored.utm_campaign ?? "",
    utm_term: stored.utm_term ?? "",
    utm_content: stored.utm_content ?? "",
  };
}

export type TrackedForm = "application" | "referral" | "contact";

type Gtag = (command: "event", name: string, params: Record<string, unknown>) => void;

/** Mirrors a form event to Google Analytics when it is loaded. No typed content is sent. */
export function trackGa(event: "form_start" | "form_step" | "form_submit", form: TrackedForm, step?: number) {
  try {
    (window as unknown as { gtag?: Gtag }).gtag?.("event", event, { form_name: form, ...(step ? { form_step: step } : {}) });
  } catch {
    // Analytics must never break the form.
  }
}

/** Sends a first-party form event. Never includes anything the visitor typed. */
export function trackFormEvent(form: TrackedForm, event: "form_start" | "form_step", step?: number) {
  trackGa(event, form, step);
  try {
    const a = getAttribution();
    const body = JSON.stringify({
      form,
      event,
      step: step ?? null,
      source_page: a.source_page,
      utm_source: a.utm_source,
      utm_medium: a.utm_medium,
      utm_campaign: a.utm_campaign,
    });
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // Analytics must never break the form.
  }
}
