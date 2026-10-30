import { tally } from "./supabase";
import { sanitizeSearch, searchColumns, type FormEvent, type Kind, type Row, type Store } from "./types";

/**
 * In-memory store for local development and tests only. Data disappears on
 * restart. Never used in production (see getStore).
 */
export function createMemoryStore(): Store {
  const rows: Record<Kind, Row[]> = { applications: [], referrals: [], contacts: [] };
  const limits = new Map<string, number>();
  const events: (FormEvent & { created_at: string })[] = [];

  return {
    async insert(kind, record) {
      const now = new Date().toISOString();
      const row = {
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
        status: "new",
        internal_notes: "",
        consent_contact_at: now,
        ...record,
      } as Row;
      rows[kind].unshift(row);
      return { id: row.id };
    },

    async list(kind, f) {
      const q = sanitizeSearch(f.q).toLowerCase();
      return rows[kind]
        .filter((r) => !f.status || r.status === f.status)
        .filter((r) => kind !== "applications" || !f.category || r.category === f.category)
        .filter(
          (r) => kind !== "applications" || !f.service_area || (r.service_areas as string[]).includes(f.service_area),
        )
        .filter((r) => !f.from || r.created_at >= `${f.from}T00:00:00Z`)
        .filter((r) => !f.to || r.created_at <= `${f.to}T23:59:59.999Z`)
        .filter((r) => !q || searchColumns[kind].some((c) => String(r[c] ?? "").toLowerCase().includes(q)))
        .slice(0, f.limit ?? 500);
    },

    async get(kind, id) {
      return rows[kind].find((r) => r.id === id) ?? null;
    },

    async update(kind, id, patch) {
      const row = rows[kind].find((r) => r.id === id);
      if (!row) throw new Error("not found");
      Object.assign(row, patch, { updated_at: new Date().toISOString() });
    },

    async checkRateLimit(key, windowSeconds, max) {
      const window = Math.floor(Date.now() / 1000 / windowSeconds);
      const k = `${key}:${window}`;
      const hits = (limits.get(k) ?? 0) + 1;
      limits.set(k, hits);
      return hits <= max;
    },

    async recordEvent(event) {
      events.push({ ...event, created_at: new Date().toISOString() });
    },

    async eventCounts(sinceDays) {
      const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
      return tally(events.filter((e) => e.created_at >= since && e.event !== "form_step"));
    },
  };
}
