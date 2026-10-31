/**
 * Transactional email (sign-in links, introduction notices) through Resend's
 * REST API. Without configuration it logs instead; in development the last
 * message per address is kept so the sign-in page can show the link.
 */

export type Message = { to: string; subject: string; text: string; html: string; replyTo?: string };

const globalForMail = globalThis as unknown as { __scOutbox?: Map<string, Message> };

export function devOutbox(): Map<string, Message> | null {
  if (process.env.NODE_ENV !== "development") return null;
  return (globalForMail.__scOutbox ??= new Map());
}

export async function sendEmail(msg: Message, fetchImpl: typeof fetch = fetch): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM || process.env.NOTIFY_EMAIL_FROM;
  if (!apiKey || !from) {
    devOutbox()?.set(msg.to.toLowerCase(), msg);
    console.warn(`[mail] Not configured; not sending "${msg.subject}" to ${msg.to}.`);
    return;
  }
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [msg.to],
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** One short message with a single button: the shape of every transactional email we send. */
export function simpleEmail(o: { heading: string; lines: string[]; button?: { label: string; url: string }; footer?: string }) {
  const text = [o.heading, "", ...o.lines, ...(o.button ? ["", `${o.button.label}: ${o.button.url}`] : []), ...(o.footer ? ["", o.footer] : [])].join("\n");
  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#011335;line-height:1.5;max-width:560px">
<h2 style="margin:0 0 16px">${escapeHtml(o.heading)}</h2>
${o.lines.map((l) => `<p style="margin:0 0 12px">${escapeHtml(l)}</p>`).join("\n")}
${o.button ? `<p style="margin:24px 0"><a href="${escapeHtml(o.button.url)}" style="display:inline-block;background:#0070FE;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(o.button.label)}</a></p>` : ""}
${o.footer ? `<p style="color:#3D4B61;font-size:13px">${escapeHtml(o.footer)}</p>` : ""}
</body></html>`;
  return { text, html };
}
