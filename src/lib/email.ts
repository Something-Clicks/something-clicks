import type { Kind } from "./store/types";

export type Notification = { kind: Kind; id: string; record: Record<string, unknown> };

type Email = { subject: string; text: string; html: string; replyTo?: string };

const titles: Record<Kind, string> = {
  applications: "New founding-member application",
  referrals: "New referral partner interest",
  contacts: "New contact message",
};

const summaryFields: Record<Kind, [string, string][]> = {
  applications: [
    ["Business", "business_name"],
    ["Category", "category"],
    ["Website", "website"],
    ["Service areas", "service_areas"],
    ["Team size", "team_size"],
    ["Commit to a collaboration in 30 days", "commit_30_days"],
    ["Fits pilot journey", "pilot_fit"],
    ["Contact", "contact_name"],
    ["Role", "contact_role"],
    ["Email", "email"],
    ["Phone", "phone"],
    ["Prefers", "preferred_contact"],
  ],
  referrals: [
    ["Name", "name"],
    ["Organization", "organization"],
    ["Role", "role"],
    ["Email", "email"],
    ["Phone", "phone"],
    ["Could introduce", "business_types"],
    ["Connection", "connection"],
    ["Notes", "notes"],
  ],
  contacts: [
    ["Name", "name"],
    ["Email", "email"],
    ["Topic", "topic"],
    ["Message", "message"],
  ],
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const display = (v: unknown) => (Array.isArray(v) ? v.join(", ") : String(v ?? "")).trim();

export function buildEmail({ kind, id, record }: Notification, siteUrl: string): Email {
  const name = display(record.business_name ?? record.organization ?? record.name);
  const subject = `${titles[kind]}: ${name}`.slice(0, 200);
  const adminUrl = `${siteUrl.replace(/\/$/, "")}/admin/${kind}/${id}`;
  const rows = summaryFields[kind]
    .map(([label, key]) => [label, display(record[key])] as const)
    .filter(([, v]) => v !== "");
  const source = [record.source_page, record.utm_source && `utm_source=${record.utm_source}`, record.utm_campaign && `utm_campaign=${record.utm_campaign}`]
    .filter(Boolean)
    .join(" · ");

  const text = [
    titles[kind],
    "",
    ...rows.map(([l, v]) => `${l}: ${v}`),
    source ? `\nSource: ${source}` : "",
    "",
    `Review in admin: ${adminUrl}`,
  ].join("\n");

  const html = `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#15263D;line-height:1.5">
<h2 style="margin:0 0 16px">${escapeHtml(titles[kind])}</h2>
<table cellpadding="6" style="border-collapse:collapse">${rows
    .map(
      ([l, v]) =>
        `<tr><td style="color:#3D4B61;vertical-align:top;white-space:nowrap">${escapeHtml(l)}</td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>
${source ? `<p style="color:#3D4B61;font-size:13px">Source: ${escapeHtml(source)}</p>` : ""}
<p><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#2853FB;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Review in admin</a></p>
</body></html>`;

  const email = display(record.email);
  return { subject, text, html, replyTo: /^[^\s@]+@[^\s@]+$/.test(email) ? email : undefined };
}

/**
 * Emails the owner about a new submission via Resend's REST API (no SDK, so
 * it runs anywhere fetch does). Without configuration it logs and skips.
 */
export async function notifyOwner(n: Notification, fetchImpl: typeof fetch = fetch): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL_TO;
  const from = process.env.NOTIFY_EMAIL_FROM;
  if (!apiKey || !to || !from) {
    console.warn(`[email] Not configured; skipping notification for ${n.kind} ${n.id}.`);
    return;
  }

  const email = buildEmail(n, process.env.SITE_URL ?? "https://somethingclicks.com");
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map((s) => s.trim()).filter(Boolean),
      subject: email.subject,
      text: email.text,
      html: email.html,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
