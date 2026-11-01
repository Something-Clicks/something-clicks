/**
 * Couples: shared settings. The couple-facing pages (browse, public vendor
 * profiles, inquiries) stay off until COUPLES_OPEN is exactly "true", so a
 * thin directory is never shown before a market has enough vendors.
 */
export const couplesOpen = () => process.env.COUPLES_OPEN === "true";

/** Where an inquiry came from. Stored on every inquiry and every counted profile view. */
export const SOURCES = ["direct_profile", "partner_profile", "joint_promotion", "planner_partner", "referral"] as const;
export type InquirySource = (typeof SOURCES)[number];

export const sourceLabels: Record<InquirySource, string> = {
  direct_profile: "Your profile",
  partner_profile: "A partner's profile",
  joint_promotion: "Joint promotion",
  planner_partner: "Planner Partner",
  referral: "Referral",
};

/** Sources a link may name with ?src=. The other two are worked out from ?via= (the partner the couple came from). */
export const LINK_SOURCES: InquirySource[] = ["joint_promotion", "referral"];

export const STATUSES = ["new", "replied", "booked", "not_a_fit"] as const;
export type InquiryStatus = (typeof STATUSES)[number];
export const statusLabels: Record<InquiryStatus, string> = { new: "New", replied: "Replied", booked: "Booked", not_a_fit: "Not a fit" };

export const BUDGETS = ["Under $1,000", "$1,000–$2,500", "$2,500–$5,000", "$5,000–$10,000", "$10,000+", "Not sure yet"] as const;

/** Browse filter: show vendors whose starting price is at or under this (vendors without a price always show). */
export const BUDGET_FILTERS = [
  { value: "1000", label: "Up to $1,000" },
  { value: "2500", label: "Up to $2,500" },
  { value: "5000", label: "Up to $5,000" },
  { value: "10000", label: "Up to $10,000" },
] as const;

export const MAX_PHOTOS = 12;
// Vercel caps request bodies at 4.5 MB, so photos go up to 4 MB (next.config raises the server-action limit to match).
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_STYLES = 8;

/** "From $2,500" / "$2,500–$6,000" / "" */
export function priceText(from: number | null, to: number | null): string {
  const f = (n: number) => `$${n.toLocaleString("en-US")}`;
  if (from != null && to != null && to > from) return `${f(from)}–${f(to)}`;
  if (from != null) return `From ${f(from)}`;
  if (to != null) return `Up to ${f(to)}`;
  return "";
}
