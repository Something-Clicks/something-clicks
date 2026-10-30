export type Kind = "applications" | "referrals" | "contacts";

export const tableFor: Record<Kind, string> = {
  applications: "network_applications",
  referrals: "referral_partner_interests",
  contacts: "contact_messages",
};

/** Columns matched by the admin text search, per kind. */
export const searchColumns: Record<Kind, string[]> = {
  applications: ["business_name", "contact_name", "email"],
  referrals: ["name", "organization", "email"],
  contacts: ["name", "email", "message"],
};

export type Attribution = {
  source_page: string;
  referrer: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
};

export type Row = Record<string, unknown> & {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  internal_notes: string;
};

export type ListFilters = {
  status?: string;
  category?: string;
  service_area?: string;
  q?: string;
  from?: string; // YYYY-MM-DD, inclusive
  to?: string; // YYYY-MM-DD, inclusive
  limit?: number;
};

export type FormEvent = {
  form: "application" | "referral" | "contact";
  event: "form_start" | "form_step" | "form_submit";
  step?: number | null;
  source_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

export type EventCount = { form: string; event: string; count: number };

export interface Store {
  insert(kind: Kind, record: Record<string, unknown>): Promise<{ id: string }>;
  list(kind: Kind, filters: ListFilters): Promise<Row[]>;
  get(kind: Kind, id: string): Promise<Row | null>;
  update(kind: Kind, id: string, patch: { status?: string; internal_notes?: string }): Promise<void>;
  checkRateLimit(key: string, windowSeconds: number, max: number): Promise<boolean>;
  recordEvent(event: FormEvent): Promise<void>;
  eventCounts(sinceDays: number): Promise<EventCount[]>;
}

/** Strips characters that have meaning in PostgREST filter syntax. */
export function sanitizeSearch(q: string | undefined): string {
  return (q ?? "").replace(/[,()%*\\"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
