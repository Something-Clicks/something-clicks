import type { Notification } from "./email";
import type { Attribution, Kind, Store } from "./store/types";
import {
  contactSchema,
  referralSchema,
  validate,
  validateApplication,
  type FieldErrors,
  type FormInput,
} from "./validation";

export const HONEYPOT_FIELD = "company_website";
export const STARTED_AT_FIELD = "form_started_at";
/** Real people take longer than this to fill in any of our forms. */
export const MIN_FILL_MS = 2500;

export const RATE_LIMITS: Record<Kind, { windowSeconds: number; max: number }> = {
  applications: { windowSeconds: 3600, max: 5 },
  referrals: { windowSeconds: 3600, max: 5 },
  contacts: { windowSeconds: 3600, max: 5 },
};

const eventForm = { applications: "application", referrals: "referral", contacts: "contact" } as const;

export type SubmissionResult =
  | { status: "ok"; id?: string; spam?: boolean }
  | { status: "invalid"; errors: FieldErrors }
  | { status: "rate_limited" }
  | { status: "error" };

export type SubmissionDeps = {
  store: Store;
  notify: (n: Notification) => Promise<void>;
  now?: () => number;
  log?: (message: string, error?: unknown) => void;
};

export type SubmissionContext = { ipHash: string; attribution: Attribution };

function validateFor(kind: Kind, input: FormInput) {
  if (kind === "applications") return validateApplication(input);
  if (kind === "referrals") return validate(referralSchema, input);
  return validate(contactSchema, input);
}

/**
 * The whole submission pipeline, independent of Next.js so it can be tested:
 * spam checks → validation → rate limit → save → notify. Saving is the only
 * step whose failure is shown to the visitor.
 */
export async function handleSubmission(
  kind: Kind,
  input: FormInput,
  ctx: SubmissionContext,
  deps: SubmissionDeps,
): Promise<SubmissionResult> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((m, e) => console.error(`[submission] ${m}`, e ?? ""));

  // Bots that fill every field, or submit instantly, get a fake success.
  if (String(input[HONEYPOT_FIELD] ?? "").trim() !== "") return { status: "ok", spam: true };
  const startedAt = Number(input[STARTED_AT_FIELD]);
  if (Number.isFinite(startedAt) && startedAt > 0 && now() - startedAt < MIN_FILL_MS) return { status: "ok", spam: true };

  const result = validateFor(kind, input);
  if (!result.ok) return { status: "invalid", errors: result.errors };

  const { windowSeconds, max } = RATE_LIMITS[kind];
  try {
    if (!(await deps.store.checkRateLimit(`${kind}:${ctx.ipHash}`, windowSeconds, max))) return { status: "rate_limited" };
  } catch (error) {
    // Fail open: losing a real application is worse than letting one extra through.
    log("rate limit check failed", error);
  }

  const data = result.data as Record<string, unknown>;
  const record = { ...data, consent_contact: data.consent_contact === "on", ...ctx.attribution };

  let id: string;
  try {
    ({ id } = await deps.store.insert(kind, record));
  } catch (error) {
    log(`saving ${kind} failed`, error);
    return { status: "error" };
  }

  try {
    await deps.notify({ kind, id, record });
  } catch (error) {
    log(`notification for ${kind} ${id} failed`, error);
  }

  try {
    await deps.store.recordEvent({
      form: eventForm[kind],
      event: "form_submit",
      source_page: ctx.attribution.source_page,
      utm_source: ctx.attribution.utm_source,
      utm_medium: ctx.attribution.utm_medium,
      utm_campaign: ctx.attribution.utm_campaign,
    });
  } catch (error) {
    log("recording form_submit failed", error);
  }

  return { status: "ok", id };
}
