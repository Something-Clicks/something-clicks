import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase Auth client used only to send and verify the admin magic link.
 * Uses the public anon key; the PKCE verifier lives in a short-lived cookie.
 */
export async function createAuthClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const jar = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => jar.set(name, value, options)),
    },
  });
}
