"use server";

import { redirect } from "next/navigation";
import { adminConfig, requireAdmin } from "@/lib/admin-auth";
import { sendEmail, simpleEmail } from "@/lib/mailer";

/** Sends one email through the same path as member sign-in links, to prove Resend works end to end. */
export async function sendTestEmail() {
  await requireAdmin();
  const to = adminConfig().email;
  if (!process.env.RESEND_API_KEY) redirect("/admin/setup?email=unconfigured");
  try {
    await sendEmail({
      to,
      subject: "Something Clicks test email",
      ...simpleEmail({ heading: "Email works.", lines: ["This is the test from the admin setup checklist. Sign-in links will arrive the same way."] }),
    });
  } catch (e) {
    console.error("[setup] test email failed", e);
    redirect(`/admin/setup?email=failed`);
  }
  redirect("/admin/setup?email=sent");
}
