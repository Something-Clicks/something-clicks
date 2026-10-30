import { b64url, fromB64url, hmac, timingSafeEqual } from "@/lib/admin-session";

/**
 * Signed member session tokens, same format as the admin's, but with a key
 * derived for members so neither cookie can stand in for the other.
 */

export const MEMBER_COOKIE = "sc_member";
export const MEMBER_TTL_SECONDS = 30 * 24 * 60 * 60;

export type MemberSession = { id: number; email: string };
type Payload = { m: number; e: string; exp: number };

const enc = new TextEncoder();
const memberKey = (secret: string) => `${secret}:member`;

export async function signMemberSession(s: MemberSession, secret: string, now = Date.now()): Promise<string> {
  const payload: Payload = { m: s.id, e: s.email.toLowerCase(), exp: Math.floor(now / 1000) + MEMBER_TTL_SECONDS };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(memberKey(secret), body))}`;
}

export async function verifyMemberSession(token: string | undefined, secret: string, now = Date.now()): Promise<MemberSession | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    if (!timingSafeEqual(fromB64url(sig), await hmac(memberKey(secret), body))) return null;
    const p = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Payload;
    if (typeof p.exp !== "number" || p.exp * 1000 < now) return null;
    if (!Number.isInteger(p.m) || typeof p.e !== "string") return null;
    return { id: p.m, email: p.e };
  } catch {
    return null;
  }
}
