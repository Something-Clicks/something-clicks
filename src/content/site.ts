/**
 * Site-wide facts and copy that Matt is expected to edit.
 * Anything wrapped in placeholder() is rendered with a visible
 * "Placeholder" marker until it is replaced with a real value.
 */

export type Placeholder = { placeholder: true; text: string };

export const placeholder = (text: string): Placeholder => ({ placeholder: true, text });

export const isPlaceholder = (value: unknown): value is Placeholder =>
  typeof value === "object" && value !== null && (value as Placeholder).placeholder === true;

export const site = {
  name: "Something Clicks",
  legalName: "Something Clicks LLC",
  region: "Salt Lake Valley, Utah",
  url: process.env.SITE_URL ?? "https://somethingclicks.com",
  tagline: "Local businesses, each other's best source of customers.",
  description:
    "Something Clicks is a managed partnership network that helps independent Salt Lake Valley businesses gain customers through complementary businesses that already serve the same people.",
  mission:
    "Make it easier for independent businesses to grow through the customers, trust, and complementary services already present in their local business community.",
  founder: { name: "Matt Hill", role: "Founder and business manager" },

  // [PLACEHOLDER] Replace with the real public contact address.
  contactEmail: placeholder("hello@somethingclicks.com"),
  // [PLACEHOLDER] Replace with the committed response window.
  responseWindow: placeholder("within [X] business days"),
  // [PLACEHOLDER] Matt to write the founder note (2–4 short paragraphs).
  founderNote: placeholder(
    "Founder note from Matt Hill goes here: why Something Clicks exists, what he has seen in local business partnerships, and what the founding pilot is setting out to learn.",
  ),
} as const;

/**
 * [PLACEHOLDER] Approved draft list of Salt Lake Valley service areas.
 * Edit freely; values are stored as-is in the database.
 */
export const serviceAreas = [
  "Salt Lake City",
  "South Salt Lake",
  "Millcreek",
  "Holladay",
  "Murray",
  "Cottonwood Heights",
  "Midvale",
  "Taylorsville",
  "West Valley City",
  "Kearns",
  "Magna",
  "West Jordan",
  "South Jordan",
  "Sandy",
  "Draper",
  "Riverton",
  "Herriman",
  "Bluffdale",
  "Other / outside the valley",
] as const;

export const consentCopy = {
  // Draft wording — pending legal review.
  contact: "I agree to be contacted by Something Clicks about this submission, and I agree to the Privacy Policy and Terms.",
  updates: "Send me occasional updates about the Something Clicks Network. I can unsubscribe at any time.",
  noGuarantee: "Submitting an application does not guarantee acceptance into the founding pilot.",
  disclosed:
    "Partner promotions are disclosed relationships: each business tells its own customers that it is sharing a partner's offer.",
} as const;

export const nav = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/for-businesses", label: "For Businesses" },
  { href: "/referral-partners", label: "Referral Partners" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;
