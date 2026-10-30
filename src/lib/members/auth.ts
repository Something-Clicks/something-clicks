import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { site } from "@/content/site";
import { adminConfig } from "@/lib/admin-auth";
import { b64url } from "@/lib/admin-session";
import { sql } from "@/lib/db";
import { sendEmail, simpleEmail } from "@/lib/mailer";
import { onSignIn } from "./claims";
import { MEMBER_COOKIE, MEMBER_TTL_SECONDS, signMemberSession, verifyMemberSession, type MemberSession } from "./session";

const LINK_TTL_MINUTES = 60;

/** Only same-site paths, so a crafted link can't send someone elsewhere after sign-in. */
export const safeNext = (next: unknown, fallback = "/dashboard") => {
  const s = String(next ?? "");
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s.slice(0, 300) : fallback;
};

export async function getMember(): Promise<MemberSession | null> {
  const jar = await cookies();
  return verifyMemberSession(jar.get(MEMBER_COOKIE)?.value, adminConfig().secret);
}

/** Call at the top of every member page and action. */
export async function requireMember(next = "/dashboard"): Promise<MemberSession> {
  const member = await getMember();
  if (!member) redirect(`/sign-in?${new URLSearchParams({ next })}`);
  return member;
}

export async function endMemberSession() {
  (await cookies()).delete(MEMBER_COOKIE);
}

async function sha256(s: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Production links always use SITE_URL; locally, the address the browser used. */
async function origin() {
  if (process.env.NODE_ENV !== "development") return site.url;
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
}

/** Emails a single-use sign-in link. `intro` is the first line of the email, e.g. why they're getting it. */
export async function sendSignInLink(email: string, next: string, intro = "Use this link to sign in to Something Clicks.") {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  await sql()`
    insert into auth_tokens (token_hash, email, next_path, expires_at)
    values (${await sha256(token)}, ${email.toLowerCase()}, ${safeNext(next)}, now() + make_interval(mins => ${LINK_TTL_MINUTES}))`;
  // Expired links are useless; clear them out as we go.
  await sql()`delete from auth_tokens where expires_at < now() - interval '1 day'`;
  const url = `${await origin()}/auth/verify?${new URLSearchParams({ token })}`;
  await sendEmail({
    to: email,
    subject: "Your Something Clicks sign-in link",
    ...simpleEmail({
      heading: "Sign in to Something Clicks",
      lines: [intro, `The link works once and expires in ${LINK_TTL_MINUTES} minutes.`],
      button: { label: "Sign in", url },
      footer: "If you didn't ask for this, you can ignore this email.",
    }),
  });
}

/**
 * Uses up a sign-in token: creates the member if new, applies any claims made
 * with this address, and starts a session. Returns where to go next, or null.
 */
export async function consumeSignInLink(token: string): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const [row] = await sql()<{ email: string; next_path: string }[]>`
    update auth_tokens set used_at = now()
    where token_hash = ${await sha256(token)} and used_at is null and expires_at > now()
    returning email, next_path`;
  if (!row) return null;
  const [member] = await sql()<{ id: number }[]>`
    insert into members (email, last_sign_in_at) values (${row.email}, now())
    on conflict (email) do update set last_sign_in_at = now()
    returning id::int`;
  await onSignIn({ id: member.id, email: row.email });
  (await cookies()).set(MEMBER_COOKIE, await signMemberSession({ id: member.id, email: row.email }, adminConfig().secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MEMBER_TTL_SECONDS,
  });
  return row.next_path;
}
