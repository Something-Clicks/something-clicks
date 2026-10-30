import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isUuid, sanitizeSearch, searchColumns, tableFor, type EventCount, type Row, type Store } from "./types";

export function createSupabaseStore(url: string, serviceRoleKey: string): Store {
  const db: SupabaseClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async insert(kind, record) {
      const { data, error } = await db.from(tableFor[kind]).insert(record).select("id").single();
      if (error) throw new Error(`insert ${kind} failed: ${error.message}`);
      return { id: data.id as string };
    },

    async list(kind, f) {
      let query = db.from(tableFor[kind]).select("*").order("created_at", { ascending: false }).limit(f.limit ?? 500);
      if (f.status) query = query.eq("status", f.status);
      if (kind === "applications" && f.category) query = query.eq("category", f.category);
      if (kind === "applications" && f.service_area) query = query.contains("service_areas", [f.service_area]);
      if (f.from) query = query.gte("created_at", `${f.from}T00:00:00Z`);
      if (f.to) query = query.lte("created_at", `${f.to}T23:59:59.999Z`);
      const q = sanitizeSearch(f.q);
      if (q) query = query.or(searchColumns[kind].map((c) => `${c}.ilike.*${q}*`).join(","));
      const { data, error } = await query;
      if (error) throw new Error(`list ${kind} failed: ${error.message}`);
      return (data ?? []) as Row[];
    },

    async get(kind, id) {
      if (!isUuid(id)) return null;
      const { data, error } = await db.from(tableFor[kind]).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(`get ${kind} failed: ${error.message}`);
      return (data as Row) ?? null;
    },

    async update(kind, id, patch) {
      if (!isUuid(id)) throw new Error("invalid id");
      const { error } = await db.from(tableFor[kind]).update(patch).eq("id", id);
      if (error) throw new Error(`update ${kind} failed: ${error.message}`);
    },

    async checkRateLimit(key, windowSeconds, max) {
      const { data, error } = await db.rpc("check_rate_limit", {
        p_key: key,
        p_window_seconds: windowSeconds,
        p_max: max,
      });
      if (error) throw new Error(`rate limit check failed: ${error.message}`);
      return data === true;
    },

    async recordEvent(event) {
      const { error } = await db.from("form_events").insert(event);
      if (error) throw new Error(`record event failed: ${error.message}`);
    },

    async eventCounts(sinceDays) {
      const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
      const { data, error } = await db
        .from("form_events")
        .select("form, event")
        .gte("created_at", since)
        .in("event", ["form_start", "form_submit"])
        .limit(20_000);
      if (error) throw new Error(`event counts failed: ${error.message}`);
      return tally(data ?? []);
    },
  };
}

export function tally(rows: { form: string; event: string }[]): EventCount[] {
  const counts = new Map<string, EventCount>();
  for (const { form, event } of rows) {
    const key = `${form}:${event}`;
    const entry = counts.get(key) ?? { form, event, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()];
}
