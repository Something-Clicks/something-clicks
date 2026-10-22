import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Role = "buyer" | "partner" | "admin";

export async function currentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function roleOf(userId: string): Promise<Role | null> {
  const { data } = await supabaseAdmin().from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data?.role as Role | null) ?? null;
}

export async function requireUser(next = "/dashboard"): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireBuyerUser(): Promise<User> {
  const user = await requireUser();
  const role = await roleOf(user.id);
  if (role === "admin") redirect("/admin");
  if (role !== "buyer") redirect("/login?error=not_buyer");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser("/admin");
  if ((await roleOf(user.id)) !== "admin") redirect("/");
  return user;
}

export async function auditLog(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await supabaseAdmin().from("admin_audit_log").insert({
    actor_id: entry.actorId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    details: entry.details ?? {},
  });
  if (error) throw new Error(`audit log write failed: ${error.message}`);
}
