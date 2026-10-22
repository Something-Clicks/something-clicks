import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

type Email = { to: string | string[]; subject: string; text: string; replyTo?: string };

let resend: Resend | null = null;

/**
 * Sends a transactional email through Resend. Without RESEND_API_KEY the email is skipped and a
 * warning is logged (subject only, never recipients or body), so the core flow still completes.
 */
export async function sendEmail(message: Email): Promise<{ sent: boolean }> {
  const key = env.resendApiKey();
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set; skipped "${message.subject}"`);
    return { sent: false };
  }
  resend ??= new Resend(key);
  try {
    const { error } = await resend.emails.send({
      from: env.emailFrom(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      replyTo: message.replyTo,
    });
    if (error) {
      console.error(`[email] Resend rejected "${message.subject}": ${error.name}`);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error(`[email] failed to send "${message.subject}": ${err instanceof Error ? err.name : "error"}`);
    return { sent: false };
  }
}

export async function notifyAdmin(subject: string, text: string): Promise<void> {
  const to = env.adminNotificationEmail();
  if (!to) {
    console.warn(`[email] ADMIN_NOTIFICATION_EMAIL not set; skipped admin alert "${subject}"`);
    return;
  }
  await sendEmail({ to, subject: `[Something Clicks] ${subject}`, text });
}
