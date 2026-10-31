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
  /** SITE_URL in Production; Vercel previews fall back to their own deployment URL. */
  url: (
    process.env.SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://somethingclicks.com")
  ).replace(/\/$/, ""),
  description:
    "Something Clicks connects wedding planners, photographers, florists, venues, caterers and other wedding professionals through referral partnerships in Dallas–Fort Worth, Atlanta, Houston, Phoenix and Nashville.",
  /** Footer and llms.txt: what Something Clicks is, in one paragraph. */
  about:
    "Something Clicks is a wedding vendor referral network that connects wedding professionals with complementary businesses to build partnerships and exchange referrals. Now in Dallas–Fort Worth, Atlanta, Houston, Phoenix and Nashville.",
  mission: "We help independent businesses grow through the businesses their customers already trust.",
  brandLine: "Make the complicated click.",
  founder: { name: "Matt Hill", role: "Founder and business manager" },

  // No email address is published on the site (scrapers); visitors use the contact form.
  // [PLACEHOLDER] Replace with the committed response window.
  responseWindow: placeholder("within [X] business days"),
  // [PLACEHOLDER] Matt to write the founder note (2–4 short paragraphs).
  founderNote: placeholder(
    "Founder note from Matt Hill goes here: why Something Clicks exists, and what he has seen in local business partnerships.",
  ),
} as const;

/** Service areas offered by the retired application form; kept so older applications still validate and filter in admin. */
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
  disclosed:
    "Partner promotions are disclosed relationships: each business tells its own customers that it is sharing a partner's offer.",
} as const;
