"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminConfig, devLoginEnabled, endSession, requireAdmin, startSession } from "@/lib/admin-auth";
import { site } from "@/content/site";
import { isKind, kindMeta } from "@/lib/admin-fields";
import { clientIp, hashIp } from "@/lib/request";
import { getStore } from "@/lib/store";
import { createAuthClient } from "@/lib/supabase-auth";

export type LoginState = { message?: string; error?: string };

const GENERIC = "If that address belongs to the site administrator, a sign-in link is on its way. It expires in one hour.";

export async function requestLoginLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };

  const ipHash = await hashIp(clientIp(await headers()));
  try {
    if (!(await getStore().checkRateLimit(`admin-login:${ipHash}`, 3600, 5)))
      return { error: "Too many sign-in attempts. Please try again in an hour." };
  } catch (error) {
    console.error("[admin] login rate limit check failed", error);
  }

  const { email: adminEmail } = adminConfig();
  // Same response either way, so the form can't be used to discover the admin address.
  if (!adminEmail || email !== adminEmail) return { message: GENERIC };

  const supabase = await createAuthClient();
  if (!supabase) return { error: "Sign-in isn't configured yet (SUPABASE_URL / SUPABASE_ANON_KEY)." };

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${site.url}/admin/auth/callback`, shouldCreateUser: false },
  });
  if (error) console.error("[admin] signInWithOtp failed", error.message);
  return { message: GENERIC };
}

export async function devLogin() {
  if (!devLoginEnabled()) throw new Error("Dev login is disabled.");
  await startSession(adminConfig().email);
  redirect("/admin");
}

export async function signOut() {
  await endSession();
  redirect("/admin/login");
}

export async function updateSubmission(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind"));
  const id = String(formData.get("id"));
  if (!isKind(kind)) throw new Error("Unknown kind");
  const status = String(formData.get("status"));
  if (!kindMeta[kind].statuses.includes(status)) throw new Error("Invalid status");
  const internal_notes = String(formData.get("internal_notes") ?? "").slice(0, 10_000);
  await getStore().update(kind, id, { status, internal_notes });
  revalidatePath(`/admin/${kind}`);
  redirect(`/admin/${kind}/${id}?saved=1`);
}
