import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./admin-session";

const DEV_SECRET = "dev-only-admin-session-secret-change-me-0000";

export function adminConfig() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const dev = process.env.NODE_ENV === "development";
  if (secret.length >= 32) return { email, secret };
  if (dev) return { email: email || "admin@localhost", secret: DEV_SECRET };
  throw new Error("ADMIN_SESSION_SECRET must be set (at least 32 characters).");
}

/** Local-only shortcut so the admin can be tried without Supabase. */
export const devLoginEnabled = () =>
  process.env.NODE_ENV === "development" && process.env.ADMIN_DEV_LOGIN === "true";

export async function getAdmin(): Promise<string | null> {
  const { email, secret } = adminConfig();
  if (!email) return null;
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value, secret, email);
}

/** Call at the top of every admin page, action, and route. */
export async function requireAdmin(): Promise<string> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function startSession(email: string) {
  const { secret } = adminConfig();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(email, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
