// Shared, non-secret constants. Safe to import from client components.

export const BUYER_TERMS_VERSION = "2026-10-draft";
export const PARTNER_TERMS_VERSION = "2026-10-draft";
export const BUSINESS_CONSENT_VERSION = "2026-10-v1";

/** Exact wording the business agrees to. Changing it requires a new BUSINESS_CONSENT_VERSION. */
export const BUSINESS_CONSENT_TEXT =
  "I agree that Something Clicks may share the details I entered on this page with one commercial " +
  "cleaning company serving my area, so it can contact me to schedule and carry out a walkthrough " +
  "and quote. Something Clicks will not share my details with anyone else for this request.";

export const SERVICE_AREAS = [
  "Salt Lake City",
  "South Salt Lake",
  "West Valley City",
  "Murray",
  "Millcreek",
  "Holladay",
  "Cottonwood Heights",
  "Midvale",
  "Sandy",
  "Draper",
  "West Jordan",
  "South Jordan",
  "Taylorsville",
  "Kearns",
  "Magna",
  "Herriman",
  "Riverton",
  "Bluffdale",
] as const;

export const PROPERTY_TYPES = [
  { value: "office", label: "Office" },
  { value: "medical", label: "Medical / dental" },
  { value: "retail", label: "Retail" },
  { value: "industrial", label: "Industrial / warehouse" },
  { value: "education", label: "School / childcare" },
  { value: "fitness", label: "Gym / fitness" },
  { value: "religious", label: "Place of worship" },
  { value: "other", label: "Other" },
] as const;

export const CLEANING_FREQUENCIES = [
  { value: "daily", label: "Daily (5+ times a week)" },
  { value: "several_weekly", label: "2–4 times a week" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "one_time", label: "One-time / move-out" },
] as const;

export const PARTNER_TYPES = [
  { value: "commercial_realtor", label: "Commercial realtor / broker" },
  { value: "leasing_agent", label: "Leasing agent" },
  { value: "property_manager", label: "Property manager" },
  { value: "commercial_mover", label: "Commercial mover" },
  { value: "office_furniture_installer", label: "Office furniture installer" },
  { value: "property_maintenance", label: "Property maintenance company" },
  { value: "other", label: "Other" },
] as const;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const ATTRIBUTION_COOKIE = "sc_ref";
