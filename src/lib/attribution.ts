// Referral attribution from a partner link (?via=CODE). Pure functions; used by middleware and
// the booking flow. First valid code within the attribution window wins.

const CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,39}$/;

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toLowerCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** Query parameter names that carry a referral code. `via` is the expected PromoteKit name (unverified). */
export function referralParamNames(): string[] {
  const configured = process.env.NEXT_PUBLIC_REFERRAL_PARAM_NAMES;
  const names = (configured || "via,ref").split(",").map((s) => s.trim()).filter(Boolean);
  return names.length ? names : ["via", "ref"];
}

export function codeFromSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): string | null {
  for (const name of referralParamNames()) {
    const value = params instanceof URLSearchParams ? params.get(name) : params[name];
    const code = normalizeReferralCode(Array.isArray(value) ? value[0] : value);
    if (code) return code;
  }
  return null;
}

export function attributionWindowDays(): number {
  const days = Number(process.env.ATTRIBUTION_WINDOW_DAYS ?? 90);
  return Number.isFinite(days) && days > 0 ? Math.floor(days) : 90;
}

export function encodeAttributionCookie(code: string, issuedAt: Date): string {
  return `${code}.${issuedAt.getTime()}`;
}

export function decodeAttributionCookie(
  value: string | null | undefined,
  now: Date,
  windowDays: number,
): { code: string; issuedAt: Date } | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const code = normalizeReferralCode(value.slice(0, dot));
  const issuedMs = Number(value.slice(dot + 1));
  if (!code || !Number.isFinite(issuedMs)) return null;
  const ageMs = now.getTime() - issuedMs;
  if (ageMs < 0 || ageMs > windowDays * 24 * 60 * 60 * 1000) return null;
  return { code, issuedAt: new Date(issuedMs) };
}

/**
 * Decides which code a visit is attributed to. An unexpired cookie (first touch) beats a code in
 * the current URL; otherwise the URL code starts a new attribution.
 */
export function resolveAttribution(input: {
  urlCode: string | null;
  cookieValue: string | null | undefined;
  now: Date;
  windowDays: number;
}): { code: string | null; setCookie: string | null } {
  const existing = decodeAttributionCookie(input.cookieValue, input.now, input.windowDays);
  if (existing) return { code: existing.code, setCookie: null };
  const urlCode = normalizeReferralCode(input.urlCode);
  if (urlCode) return { code: urlCode, setCookie: encodeAttributionCookie(urlCode, input.now) };
  return { code: null, setCookie: null };
}
