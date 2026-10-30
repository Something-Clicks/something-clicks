import { z } from "zod";
import {
  audienceSizes,
  categories,
  channels,
  collaborationInterests,
  commitOptions,
  contactMethods,
  contactTopics,
  pilotFitOptions,
  serviceAreas,
  teamSizes,
  timePerMonth,
  valuesOf,
  yearsInBusiness,
} from "@/content/options";

/**
 * Validation schemas shared by the browser (instant feedback) and the server
 * (authoritative). Field names match database columns.
 */

export type FieldErrors = Record<string, string>;
export type FormInput = Record<string, string | string[]>;

const SHORT = 200;
const LONG = 2000;

const required = (label: string, max = SHORT) =>
  z
    .string({ error: `Please enter ${label}.` })
    .trim()
    .min(1, { error: `Please enter ${label}.` })
    .max(max, { error: `Please keep this under ${max} characters.` });

const optionalText = (max = LONG) =>
  z
    .string()
    .trim()
    .max(max, { error: `Please keep this under ${max} characters.` })
    .default("");

const choice = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.enum(values, { error: message });

const multi = <T extends readonly [string, ...string[]]>(values: T, message: string) =>
  z.array(z.enum(values, { error: "Please choose from the list." }), { error: message }).min(1, { error: message });

const email = z
  .string({ error: "Please enter your email address." })
  .trim()
  .toLowerCase()
  .min(1, { error: "Please enter your email address." })
  .max(254, { error: "That email address is too long." })
  .pipe(z.email({ error: "Please enter a valid email address, like name@business.com." }));

const phone = z
  .string()
  .trim()
  .max(30, { error: "Please enter a valid phone number." })
  .refine((v) => v === "" || (/^[0-9+().\-\s]{7,30}$/.test(v) && v.replace(/\D/g, "").length >= 7), {
    error: "Please enter a valid phone number, or leave it blank.",
  })
  .default("");

/** Accepts a full URL, a bare domain, or a social profile link. Normalizes to https://. */
const website = z
  .string({ error: "Please enter your website or main social link." })
  .trim()
  .min(1, { error: "Please enter your website or main social link." })
  .max(300, { error: "Please keep this under 300 characters." })
  .transform((v, ctx) => {
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const url = new URL(withScheme);
      if (!url.hostname.includes(".") || /\s/.test(v)) throw new Error("bad host");
      return url.toString();
    } catch {
      ctx.addIssue({ code: "custom", message: "Please enter a link like yourbusiness.com or instagram.com/yourbusiness." });
      return z.NEVER;
    }
  });

const consentRequired = z.literal("on", {
  error: "Please check this box so we can contact you about your submission.",
});
const consentOptional = z
  .string()
  .optional()
  .transform((v) => v === "on");

const channelValues = valuesOf(channels);
const interestValues = valuesOf(collaborationInterests);
const audienceKey = (channel: string) => `audience_${channel}`;

// ---------------------------------------------------------------------------
// Founding-member application, one schema per step.
// ---------------------------------------------------------------------------

export const applicationSteps = [
  {
    id: "business",
    title: "Your business",
    schema: z
      .object({
        business_name: required("your business name"),
        website,
        category: choice(categories as unknown as [string, ...string[]], "Please choose a category."),
        category_other: optionalText(SHORT),
        years_in_business: choice(yearsInBusiness, "Please choose how long you've been in business."),
        team_size: choice(teamSizes, "Please choose your team size."),
        service_areas: multi(serviceAreas, "Please choose at least one area you serve."),
      })
      .superRefine((v, ctx) => {
        if (v.category === "Other" && !v.category_other)
          ctx.addIssue({ code: "custom", path: ["category_other"], message: "Please describe your category." });
      }),
  },
  {
    id: "customers",
    title: "Your customers",
    schema: z.object({
      ideal_customer: required("a short description of your ideal customer", LONG),
      customer_needs: required("your customers' typical situations or needs", LONG),
      needs_before: required("what customers need right before buying from you", LONG),
      needs_after: required("what customers need right after buying from you", LONG),
    }),
  },
  {
    id: "channels",
    title: "How you reach customers",
    schema: z
      .object({
        channels: multi(channelValues, "Please choose at least one way you reach customers."),
        channel_other: optionalText(SHORT),
        ...Object.fromEntries(channelValues.map((c) => [audienceKey(c), z.string().default("")])),
      })
      .superRefine((v, ctx) => {
        const values = v as Record<string, unknown>;
        for (const c of v.channels) {
          const size = values[audienceKey(c)];
          if (!(audienceSizes as readonly string[]).includes(String(size)))
            ctx.addIssue({ code: "custom", path: [audienceKey(c)], message: "Please choose an approximate audience size." });
        }
        if (v.channels.includes("other") && !v.channel_other)
          ctx.addIssue({ code: "custom", path: ["channel_other"], message: "Please describe the other channel." });
      })
      .transform((v) => {
        const values = v as Record<string, unknown>;
        return {
          channels: v.channels.map((c) => ({ channel: c, audience: String(values[audienceKey(c)]) })),
          channel_other: v.channels.includes("other") ? v.channel_other : "",
        };
      }),
  },
  {
    id: "partnerships",
    title: "Partnerships and capacity",
    schema: z
      .object({
        current_referrals: optionalText(),
        desired_partner_types: required("the types of businesses you'd like to partner with", LONG),
        collaboration_interests: multi(interestValues, "Please choose at least one kind of collaboration."),
        collaboration_other: optionalText(SHORT),
        past_experience: optionalText(),
        time_per_month: choice(timePerMonth, "Please choose how much time you can realistically give."),
        commit_30_days: choice(valuesOf(commitOptions), "Please choose yes, maybe, or no."),
        pilot_fit: choice(valuesOf(pilotFitOptions), "Please choose one."),
      })
      .superRefine((v, ctx) => {
        if (v.collaboration_interests.includes("other") && !v.collaboration_other)
          ctx.addIssue({ code: "custom", path: ["collaboration_other"], message: "Please describe the other collaboration." });
      }),
  },
  {
    id: "contact",
    title: "Contact and consent",
    schema: z.object({
      contact_name: required("your name"),
      contact_role: required("your role"),
      email,
      phone,
      preferred_contact: choice(valuesOf(contactMethods), "Please choose how you'd like us to contact you."),
      consent_contact: consentRequired,
      consent_updates: consentOptional,
    }),
  },
] as const;

/** Fields that belong to each step, for jumping to the first step with an error. */
export const applicationStepFields: Record<string, string[]> = {
  business: ["business_name", "website", "category", "category_other", "years_in_business", "team_size", "service_areas"],
  customers: ["ideal_customer", "customer_needs", "needs_before", "needs_after"],
  channels: ["channels", "channel_other", ...channelValues.map(audienceKey)],
  partnerships: [
    "current_referrals",
    "desired_partner_types",
    "collaboration_interests",
    "collaboration_other",
    "past_experience",
    "time_per_month",
    "commit_30_days",
    "pilot_fit",
  ],
  contact: ["contact_name", "contact_role", "email", "phone", "preferred_contact", "consent_contact", "consent_updates"],
};

export type ApplicationData = z.output<(typeof applicationSteps)[0]["schema"]> &
  z.output<(typeof applicationSteps)[1]["schema"]> &
  z.output<(typeof applicationSteps)[2]["schema"]> &
  z.output<(typeof applicationSteps)[3]["schema"]> &
  z.output<(typeof applicationSteps)[4]["schema"]>;

export const referralSchema = z.object({
  name: required("your name"),
  organization: required("your organization"),
  role: required("your role"),
  email,
  phone,
  business_types: required("the types of businesses you could introduce", LONG),
  connection: required("how you're connected to those businesses", LONG),
  notes: optionalText(),
  consent_contact: consentRequired,
});
export type ReferralData = z.output<typeof referralSchema>;

export const contactSchema = z.object({
  name: required("your name"),
  email,
  topic: choice(valuesOf(contactTopics), "Please choose a topic."),
  message: required("a message", 5000),
  consent_contact: consentRequired,
});
export type ContactData = z.output<typeof contactSchema>;

// ---------------------------------------------------------------------------

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

export function validate<S extends z.ZodType>(schema: S, input: unknown): ValidationResult<z.output<S>> {
  const result = schema.safeParse(input);
  return result.success ? { ok: true, data: result.data } : { ok: false, errors: toFieldErrors(result.error) };
}

export function validateApplication(input: FormInput): ValidationResult<ApplicationData> {
  let errors: FieldErrors = {};
  let data = {};
  for (const step of applicationSteps) {
    const result = validate(step.schema as z.ZodType, input);
    if (result.ok) data = { ...data, ...(result.data as object) };
    else errors = { ...errors, ...result.errors };
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data: data as ApplicationData };
}

/** Multi-value fields; everything else is read as a single string. */
const MULTI_FIELDS = new Set(["service_areas", "channels", "collaboration_interests"]);

export function formDataToInput(formData: FormData): FormInput {
  const out: FormInput = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    out[key] = MULTI_FIELDS.has(key)
      ? formData.getAll(key).map(String)
      : String(formData.get(key) ?? "");
  }
  for (const key of MULTI_FIELDS) out[key] ??= [];
  return out;
}
