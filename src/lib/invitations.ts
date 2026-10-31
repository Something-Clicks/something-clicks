import { b64url, fromB64url, hmac, timingSafeEqual } from "@/lib/admin-session";
import { escapeHtml } from "@/lib/mailer";

/**
 * Invitation email templates (drafts: nothing in the codebase sends them yet).
 *
 * CAN-SPAM, on every message: Something Clicks is named as the sender, the
 * subject says what the email is, the postal address (MAILING_ADDRESS) is in
 * the footer, and there is a one-click unsubscribe (link plus RFC 8058
 * List-Unsubscribe headers). Opt-outs go straight onto the suppression list.
 * Honesty rules: counts are live, an imported business is never described as
 * a member, and nobody is said to be "waiting" to connect.
 */

export const SENDER_NAME = "Something Clicks";

/** The postal address for the footer, or null while it is unset or still the [ADDRESS] placeholder. */
export function mailingAddress(value = process.env.MAILING_ADDRESS): string | null {
  const v = (value ?? "").trim();
  return v && !v.includes("[ADDRESS]") ? v : null;
}

/** Why invitations can't be sent right now. Empty means nothing blocks them, but there is still no send code. */
export function sendingBlockers(env: Record<string, string | undefined> = process.env): string[] {
  const out: string[] = [];
  if (!mailingAddress(env.MAILING_ADDRESS)) out.push("MAILING_ADDRESS is not set (required in every commercial email).");
  if (!env.INVITE_EMAIL_FROM) out.push("INVITE_EMAIL_FROM is not set (an address on hello.somethingclicks.com, verified in Resend).");
  return out;
}

// ---------------------------------------------------------------------------
// Unsubscribe links: the address, signed, so a link can't unsubscribe anyone else.
// ---------------------------------------------------------------------------

const enc = new TextEncoder();
const key = (secret: string) => `${secret}:unsubscribe`;

export async function unsubscribeToken(email: string, secret: string): Promise<string> {
  const body = b64url(enc.encode(email.trim().toLowerCase()));
  return `${body}.${b64url((await hmac(key(secret), body)).slice(0, 16))}`;
}

export async function readUnsubscribeToken(token: string, secret: string): Promise<string | null> {
  const [body, sig] = (token ?? "").split(".");
  if (!body || !sig) return null;
  try {
    if (!timingSafeEqual(fromB64url(sig), (await hmac(key(secret), body)).slice(0, 16))) return null;
    return new TextDecoder().decode(fromB64url(body));
  } catch {
    return null;
  }
}

/** Adds the address to the suppression list; checked before every send. Idempotent. */
export async function unsubscribe(email: string): Promise<void> {
  const { sql } = await import("@/lib/db");
  await sql()`insert into suppression (kind, value, reason) values ('email', ${email.trim().toLowerCase()}, 'unsubscribe')
              on conflict (kind, value) do nothing`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export type Rendered = { subject: string; text: string; html: string; headers: Record<string, string> };

type Common = {
  /** Recipient business, as listed. */
  business: string;
  /** Recipient address (an imported business email, or one a member entered). */
  to: string;
  siteUrl: string;
  unsubscribeToken: string;
  /** Required. Rendering refuses without it unless `preview` is set. */
  address: string | null;
  preview?: boolean;
};

export type ClusterInvite = Common & {
  /** Live count of this business's current matches. */
  count: number;
  city: string;
  /** Plural labels of the most common matching categories, e.g. ["planners", "venues", "florists"]. */
  examples: string[];
  claimPath: string;
};

export type MemberInvite = Common & {
  fromBusiness: string;
  fromCategory: string;
  fromCity: string;
  note?: string;
  claimPath: string;
};

export class InvitationBlocked extends Error {}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function footer(c: Common, reason: string) {
  if (!c.address && !c.preview) throw new InvitationBlocked("MAILING_ADDRESS is not set; invitations can't be rendered for sending.");
  const address = c.address ?? "[ADDRESS]";
  const unsubscribe = `${c.siteUrl}/unsubscribe?t=${encodeURIComponent(c.unsubscribeToken)}`;
  const lines = [
    reason,
    `Don't want emails from us? Unsubscribe: ${unsubscribe}`,
    `${SENDER_NAME} LLC · ${address}`,
  ];
  const html = `<hr style="border:none;border-top:1px solid #D5DEEF;margin:28px 0 16px">
<p style="color:#3D4B61;font-size:13px;margin:0 0 8px">${escapeHtml(reason)}</p>
<p style="color:#3D4B61;font-size:13px;margin:0 0 8px"><a href="${escapeHtml(unsubscribe)}" style="color:#3D4B61">Unsubscribe</a> and we won't email you again.</p>
<p style="color:#3D4B61;font-size:13px;margin:0">${SENDER_NAME} LLC · ${escapeHtml(address)}</p>`;
  return {
    text: lines.join("\n"),
    html,
    // Mail apps POST here directly (RFC 8058); the link above opens the confirmation page.
    headers: {
      "List-Unsubscribe": `<${c.siteUrl}/api/unsubscribe?t=${encodeURIComponent(c.unsubscribeToken)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

function layout(paragraphs: string[], button: { label: string; url: string }, foot: { html: string }, signature?: string) {
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#011335;line-height:1.55;max-width:560px">
${paragraphs.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`).join("\n")}
<p style="margin:22px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#0070FE;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(button.label)}</a></p>
${signature ? `<p style="margin:0 0 14px">${escapeHtml(signature)}</p>\n` : ""}${foot.html}
</body></html>`;
}

/** Sent by Something Clicks to a listed business in an active cluster, in a batch Matt approved. */
export function clusterInvite(v: ClusterInvite): Rendered {
  const url = `${v.siteUrl}${v.claimPath}`;
  const kinds = list(v.examples.slice(0, 3));
  const noun = v.count === 1 ? "wedding business" : "wedding businesses";
  const subject = `${v.count} ${noun} near ${v.city} ${v.count === 1 ? "fits" : "fit"} ${v.business}`;
  const paragraphs = [
    `Hi ${v.business},`,
    `I'm Matt with Something Clicks. We map which local wedding businesses fit together, and ${v.business} fits ${v.count} ${noun} near ${v.city}${kinds ? `, including ${kinds}` : ""}.`,
    "Businesses like these can send each other referrals: they serve the same couples at different moments.",
    "Want to see who they are? Claim your business. Free to claim your business and see your matches.",
  ];
  const foot = footer(
    v,
    `You're getting this because ${v.business} is in public business listings with this address. This is the only email we'll send unless you claim your business.`,
  );
  return {
    subject,
    text: [...paragraphs, `See who they are: ${url}`, "Matt Hill, Something Clicks", foot.text].join("\n\n"),
    html: layout(paragraphs, { label: "See who they are", url }, foot, "Matt Hill, Something Clicks"),
    headers: foot.headers,
  };
}

/** Sent when a member presses Invite on a match that isn't on Something Clicks yet. */
export function memberInvite(v: MemberInvite): Rendered {
  const url = `${v.siteUrl}${v.claimPath}`;
  const subject = `${v.fromBusiness} would like to connect with ${v.business}`;
  const paragraphs = [
    `Hi ${v.business},`,
    `${v.fromBusiness}, a ${v.fromCategory.toLowerCase()} in ${v.fromCity}, saw ${v.business} in their Something Clicks matches and asked us to invite you to connect.`,
    ...(v.note ? [`Their note: "${v.note}"`] : []),
    `To connect, claim your business. Once you both accept, you'll see each other's contact details. Free to claim your business and see your matches.`,
  ];
  const foot = footer(v, `${SENDER_NAME} sent this at ${v.fromBusiness}'s request. We haven't shared your email address with them.`);
  return {
    subject,
    text: [...paragraphs, `See their invitation: ${url}`, foot.text].join("\n\n"),
    html: layout(paragraphs, { label: "See their invitation", url }, foot),
    headers: foot.headers,
  };
}
