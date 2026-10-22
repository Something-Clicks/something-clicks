import { z } from "zod";
import { CLEANING_FREQUENCIES, PARTNER_TYPES, PROPERTY_TYPES, SERVICE_AREAS } from "@/lib/constants";

const values = <T extends readonly { value: string }[]>(opts: T) =>
  opts.map((o) => o.value) as [T[number]["value"], ...T[number]["value"][]];

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} is too long`);

export const email = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254);

export const phone = z
  .string({ required_error: "Phone is required" })
  .trim()
  .transform((s) => s.replace(/[^\d+]/g, ""))
  .refine((s) => /^\+?1?\d{10}$/.test(s), "Enter a 10-digit phone number");

const zip = z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP code");

const checkbox = (message: string) => z.literal("on", { errorMap: () => ({ message }) });

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s ? s : null));

export const partnerApplicationSchema = z.object({
  full_name: trimmed(2, 120, "Name"),
  business_name: trimmed(2, 160, "Business name"),
  email,
  phone,
  partner_type: z.enum(values(PARTNER_TYPES), { errorMap: () => ({ message: "Choose your type of business" }) }),
  referral_plan: trimmed(10, 2000, "How you plan to refer businesses"),
  agree_terms: checkbox("You must agree to the partner terms"),
});

export const bookingRequestSchema = z.object({
  business_name: trimmed(2, 160, "Business name"),
  contact_name: trimmed(2, 120, "Your name"),
  contact_title: optionalText(120),
  email,
  phone,
  address_line1: trimmed(3, 200, "Street address"),
  city: trimmed(2, 80, "City"),
  zip,
  property_type: z.enum(values(PROPERTY_TYPES), { errorMap: () => ({ message: "Choose a property type" }) }),
  approx_sq_ft: z.coerce
    .number({ invalid_type_error: "Enter the approximate square footage" })
    .int()
    .min(100, "Enter the approximate square footage")
    .max(5_000_000),
  cleaning_frequency: z.enum(values(CLEANING_FREQUENCIES), {
    errorMap: () => ({ message: "Choose how often you need cleaning" }),
  }),
  is_decision_maker: z.enum(["yes", "no"], { errorMap: () => ({ message: "Tell us if you make this decision" }) }),
  current_contract_end: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s ? s : null))
    .refine((s) => s === null || /^\d{4}-\d{2}-\d{2}$/.test(s), "Enter a valid date"),
  preferred_times: optionalText(500),
  notes: optionalText(2000),
  consent: checkbox("Please agree so we can share your request with one cleaning company"),
});

const time = z.string().regex(/^\d{2}:\d{2}$/, "Enter a time");

export const buyerOnboardingSchema = z
  .object({
    company_name: trimmed(2, 200, "Company name"),
    contact_name: trimmed(2, 200, "Contact name"),
    phone,
    website: optionalText(300),
    service_areas: z
      .array(z.enum(SERVICE_AREAS))
      .min(1, "Choose at least one service area"),
    min_sq_ft: z.coerce.number().int().min(0).max(5_000_000),
    property_types: z.array(z.enum(values(PROPERTY_TYPES))).min(1, "Choose at least one property type"),
    cleaning_frequencies: z
      .array(z.enum(values(CLEANING_FREQUENCIES)))
      .min(1, "Choose at least one cleaning frequency"),
    notes: optionalText(2000),
    availability_days: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Choose at least one day"),
    availability_start: time,
    availability_end: time,
    agree_terms: z.literal("on").optional(),
  })
  .refine((v) => v.availability_end > v.availability_start, {
    message: "End time must be after start time",
    path: ["availability_end"],
  });

export const signupSchema = z.object({
  email,
  password: z.string().min(10, "Use at least 10 characters").max(200),
});

export const creditPackSchema = z.object({
  name: trimmed(2, 80, "Name"),
  credits: z.coerce.number().int().min(1).max(500),
  price_dollars: z.coerce.number().positive("Price must be more than $0").max(100_000),
});

const optionalDollars = z
  .string()
  .trim()
  .transform((s) => (s === "" ? null : Number(s)))
  .refine((n) => n === null || (Number.isFinite(n) && n > 0), "Must be more than $0, or blank");

export const settingsSchema = z.object({
  price_per_appointment: optionalDollars,
  commission_amount: optionalDollars,
  dispute_window_hours: z.coerce.number().int().min(1).max(24 * 30),
  referral_expiry_days: z.coerce.number().int().min(1).max(365),
});

export const adjustmentSchema = z.object({
  delta: z.coerce.number().int().refine((n) => n !== 0 && Math.abs(n) <= 500, "Enter a non-zero number of credits"),
  note: trimmed(3, 500, "Reason"),
});

/** Reads a form into a plain object; fields listed in `arrays` keep every value. */
export function formToObject(form: FormData, arrays: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    out[key] = arrays.includes(key) ? form.getAll(key).map(String) : String(form.get(key) ?? "");
  }
  for (const key of arrays) if (!(key in out)) out[key] = [];
  return out;
}

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Key used to spot the same business at the same address across referrals. */
export function addressKey(addressLine1: string, zipCode: string): string {
  const normalized = addressLine1
    .toLowerCase()
    .replace(/#/g, " ste ")
    .replace(/[.,]/g, " ")
    .replace(/\b(street)\b/g, "st")
    .replace(/\b(avenue)\b/g, "ave")
    .replace(/\b(road)\b/g, "rd")
    .replace(/\b(drive)\b/g, "dr")
    .replace(/\b(boulevard)\b/g, "blvd")
    .replace(/\b(suite|ste|unit|apt)\b/g, "ste")
    .replace(/\b(north)\b/g, "n")
    .replace(/\b(south)\b/g, "s")
    .replace(/\b(east)\b/g, "e")
    .replace(/\b(west)\b/g, "w")
    .replace(/\s+/g, " ")
    .trim();
  return `${normalized}|${zipCode.trim()}`;
}
