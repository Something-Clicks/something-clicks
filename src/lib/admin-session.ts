/**
 * Signed admin session tokens: base64url(payload) + "." + base64url(HMAC-SHA256).
 * Pure Web Crypto so it runs in Node, edge runtimes, and tests.
 */

export const SESSION_COOKIE = "sc_admin";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

type Payload = { email: string; exp: number };

const enc = new TextEncoder();

export const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export const fromB64url = (s: string) => {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

export async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signSession(email: string, secret: string, now = Date.now()): Promise<string> {
  const payload: Payload = { email: email.toLowerCase(), exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

/** Returns the email if the token is authentic, unexpired, and for the expected admin. */
export async function verifySession(
  token: string | undefined,
  secret: string,
  expectedEmail: string,
  now = Date.now(),
): Promise<string | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    if (!timingSafeEqual(fromB64url(sig), await hmac(secret, body))) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Payload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < now) return null;
    if (payload.email !== expectedEmail.trim().toLowerCase()) return null;
    return payload.email;
  } catch {
    return null;
  }
}
