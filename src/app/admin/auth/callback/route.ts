import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { adminConfig, startSession } from "@/lib/admin-auth";
import { createAuthClient } from "@/lib/supabase-auth";

/**
 * Magic-link landing. Verifies the link with Supabase, confirms the address is
 * ADMIN_EMAIL, then swaps the Supabase session for our own signed cookie.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const fail = NextResponse.redirect(new URL("/admin/login?error=link", url.origin));
  const supabase = await createAuthClient();
  if (!supabase) return fail;

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { data: null, error: new Error("missing code") };

  const email = data?.user?.email?.toLowerCase();
  await supabase.auth.signOut().catch(() => {});
  if (error || !email || email !== adminConfig().email) return fail;

  await startSession(email);
  return NextResponse.redirect(new URL("/admin", url.origin));
}
