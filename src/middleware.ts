import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { attributionWindowDays, codeFromSearchParams, resolveAttribution } from "@/lib/attribution";
import { ATTRIBUTION_COOKIE } from "@/lib/constants";

const AUTH_PATHS = ["/dashboard", "/onboarding", "/admin", "/login", "/signup", "/auth"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Refresh the Supabase session on signed-in areas so server components see a valid user.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anonKey && AUTH_PATHS.some((p) => request.nextUrl.pathname.startsWith(p))) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }

  // Partner link attribution: remember the first valid referral code for the attribution window.
  const urlCode = codeFromSearchParams(request.nextUrl.searchParams);
  if (urlCode) {
    const windowDays = attributionWindowDays();
    const { setCookie } = resolveAttribution({
      urlCode,
      cookieValue: request.cookies.get(ATTRIBUTION_COOKIE)?.value,
      now: new Date(),
      windowDays,
    });
    if (setCookie) {
      response.cookies.set(ATTRIBUTION_COOKIE, setCookie, {
        httpOnly: true,
        secure: request.nextUrl.protocol === "https:",
        sameSite: "lax",
        path: "/",
        maxAge: windowDays * 24 * 60 * 60,
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
