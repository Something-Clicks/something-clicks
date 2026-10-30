import {
  applicationStatuses,
  channels,
  collaborationInterests,
  commitOptions,
  contactMethods,
  contactTopics,
  inquiryStatuses,
  labelFor,
  pilotFitOptions,
} from "@/content/options";
import type { Kind, ListFilters } from "./store/types";

export type FieldDef = { key: string; label: string; format?: (v: unknown) => string; long?: boolean };

const join = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? ""));
const yesNo = (v: unknown) => (v === true ? "Yes" : v === false ? "No" : "");
const via = (opts: readonly { value: string; label: string }[]) => (v: unknown) => labelFor(opts, String(v ?? ""));
const viaMany = (opts: readonly { value: string; label: string }[]) => (v: unknown) =>
  (Array.isArray(v) ? v : []).map((x) => labelFor(opts, String(x))).join(", ");
const channelList = (v: unknown) =>
  (Array.isArray(v) ? v : [])
    .map((c: { channel?: string; audience?: string }) => `${labelFor(channels, c.channel ?? "")} (${c.audience ?? "?"})`)
    .join("; ");

export const kinds: Kind[] = ["applications", "referrals", "contacts"];

export const kindMeta: Record<Kind, { title: string; singular: string; statuses: readonly string[]; nameKey: string; secondaryKey: string }> = {
  applications: { title: "Applications", singular: "Application", statuses: applicationStatuses, nameKey: "business_name", secondaryKey: "category" },
  referrals: { title: "Referral partners", singular: "Referral partner", statuses: inquiryStatuses, nameKey: "name", secondaryKey: "organization" },
  contacts: { title: "Contact messages", singular: "Contact message", statuses: inquiryStatuses, nameKey: "name", secondaryKey: "topic" },
};

export const isKind = (v: string): v is Kind => (kinds as string[]).includes(v);

/** Detail sections, in display order. */
export const sections: Record<Kind, { title: string; fields: FieldDef[] }[]> = {
  applications: [
    {
      title: "Business",
      fields: [
        { key: "business_name", label: "Business name" },
        { key: "website", label: "Website / social" },
        { key: "category", label: "Category" },
        { key: "category_other", label: "Category (other)" },
        { key: "years_in_business", label: "Years in business" },
        { key: "team_size", label: "Team size" },
        { key: "service_areas", label: "Service areas", format: join },
      ],
    },
    {
      title: "Customers",
      fields: [
        { key: "ideal_customer", label: "Ideal customer", long: true },
        { key: "customer_needs", label: "Typical situations / needs", long: true },
        { key: "needs_before", label: "Needs right before", long: true },
        { key: "needs_after", label: "Needs right after", long: true },
      ],
    },
    {
      title: "Channels",
      fields: [
        { key: "channels", label: "Channels (audience)", format: channelList },
        { key: "channel_other", label: "Other channel" },
      ],
    },
    {
      title: "Partnerships and capacity",
      fields: [
        { key: "current_referrals", label: "Current referral relationships", long: true },
        { key: "desired_partner_types", label: "Desired partner types", long: true },
        { key: "collaboration_interests", label: "Collaboration interests", format: viaMany(collaborationInterests) },
        { key: "collaboration_other", label: "Other collaboration" },
        { key: "past_experience", label: "Past cross-promotion", long: true },
        { key: "time_per_month", label: "Time per month" },
        { key: "commit_30_days", label: "Commit within 30 days", format: via(commitOptions) },
        { key: "pilot_fit", label: "Fits pilot journey", format: via(pilotFitOptions) },
      ],
    },
    {
      title: "Contact",
      fields: [
        { key: "contact_name", label: "Name" },
        { key: "contact_role", label: "Role" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "preferred_contact", label: "Preferred contact", format: via(contactMethods) },
        { key: "consent_contact", label: "Consented to contact", format: yesNo },
        { key: "consent_updates", label: "Wants updates", format: yesNo },
      ],
    },
  ],
  referrals: [
    {
      title: "Referral partner",
      fields: [
        { key: "name", label: "Name" },
        { key: "organization", label: "Organization" },
        { key: "role", label: "Role" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "business_types", label: "Could introduce", long: true },
        { key: "connection", label: "Connection", long: true },
        { key: "notes", label: "Notes", long: true },
        { key: "consent_contact", label: "Consented to contact", format: yesNo },
      ],
    },
  ],
  contacts: [
    {
      title: "Message",
      fields: [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "topic", label: "Topic", format: via(contactTopics) },
        { key: "message", label: "Message", long: true },
        { key: "consent_contact", label: "Consented to contact", format: yesNo },
      ],
    },
  ],
};

export const attributionFields: FieldDef[] = [
  { key: "source_page", label: "Source page" },
  { key: "referrer", label: "Referrer" },
  { key: "utm_source", label: "utm_source" },
  { key: "utm_medium", label: "utm_medium" },
  { key: "utm_campaign", label: "utm_campaign" },
  { key: "utm_term", label: "utm_term" },
  { key: "utm_content", label: "utm_content" },
];

/** CSV columns: metadata, every form field (formatted), notes, attribution. */
export function csvColumns(kind: Kind) {
  const fields = sections[kind].flatMap((s) => s.fields);
  return [
    { key: "id", label: "ID" },
    { key: "created_at", label: "Submitted (UTC)" },
    { key: "status", label: "Status" },
    ...fields.map((f) => ({ key: f.key, label: f.label })),
    { key: "internal_notes", label: "Internal notes" },
    ...attributionFields.map((f) => ({ key: f.key, label: f.label })),
  ];
}

export function formatRowForCsv(kind: Kind, row: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...row };
  for (const f of sections[kind].flatMap((s) => s.fields)) if (f.format) out[f.key] = f.format(row[f.key]);
  return out;
}

export const formatValue = (f: FieldDef, v: unknown) => (f.format ? f.format(v) : join(v));

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Denver",
    dateStyle: "medium",
    timeStyle: "short",
  });

const isoDate = (v: string | undefined) => (/^\d{4}-\d{2}-\d{2}$/.test(v ?? "") ? v : undefined);

/** Reads list filters from query parameters; anything unexpected is dropped. */
export const pickFilters = (sp: Record<string, string | undefined>): ListFilters => ({
  status: sp.status || undefined,
  category: sp.category || undefined,
  service_area: sp.service_area || undefined,
  q: sp.q || undefined,
  from: isoDate(sp.from),
  to: isoDate(sp.to),
});
