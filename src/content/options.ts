import { pilot } from "./pilot";
import { serviceAreas } from "./site";

/** Select/checkbox options for the forms. Values are what gets stored. */

export const categories = [
  ...pilot.memberTypes,
  "Real estate and property management",
  "Professional services (accounting, legal, insurance)",
  "Home services",
  "Events and weddings",
  "Health, wellness, and fitness",
  "Retail",
  "Food and beverage",
  "Other",
] as const;

export const yearsInBusiness = ["Less than 1 year", "1–2 years", "3–5 years", "6–10 years", "More than 10 years"] as const;

export const teamSizes = ["Just me", "2–5", "6–15", "16–50", "More than 50"] as const;

export const channels = [
  { value: "email", label: "Email list or newsletter" },
  { value: "social", label: "Social media" },
  { value: "in_person", label: "In person (storefront, job sites, events)" },
  { value: "receipts", label: "Receipts, invoices, or packaging" },
  { value: "introductions", label: "Direct introductions and word of mouth" },
  { value: "other", label: "Other" },
] as const;

export const audienceSizes = ["Under 100", "100–500", "500–2,000", "2,000–10,000", "More than 10,000", "Not sure"] as const;

export const collaborationInterests = [
  { value: "joint_offer", label: "Creating a joint offer" },
  { value: "share_partner_offer", label: "Sharing a partner's offer with my customers" },
  { value: "co_content", label: "Co-created content" },
  { value: "local_event", label: "A local event" },
  { value: "other", label: "Other" },
] as const;

export const timePerMonth = ["Less than 1 hour", "1–2 hours", "3–5 hours", "More than 5 hours"] as const;

export const commitOptions = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
] as const;

export const pilotFitOptions = [
  { value: "yes", label: `Yes, my customers fit the ${pilot.shortName} journey` },
  { value: "not_sure", label: "Not sure" },
  { value: "no", label: "No, I'm applying for a future cycle" },
] as const;

export const contactMethods = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone call" },
  { value: "text", label: "Text message" },
] as const;

export const contactTopics = [
  { value: "general", label: "General question" },
  { value: "claim", label: "Claiming my business" },
  { value: "removal", label: "Removing my business" },
  { value: "referral", label: "Referral partnerships" },
  { value: "press", label: "Press" },
  { value: "other", label: "Other" },
] as const;

export { serviceAreas };

export const applicationStatuses = ["new", "reviewing", "accepted", "waitlisted", "declined"] as const;
export const inquiryStatuses = ["new", "contacted", "closed"] as const;

export const valuesOf = <T extends readonly { value: string }[]>(opts: T) =>
  opts.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

export const labelFor = (opts: readonly { value: string; label: string }[], value: string) =>
  opts.find((o) => o.value === value)?.label ?? value;
