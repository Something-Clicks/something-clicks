"use server";

import { redirect } from "next/navigation";
import { adminConfig } from "@/lib/admin-auth";
import { readUnsubscribeToken, unsubscribe } from "@/lib/invitations";

export async function unsubscribeAction(formData: FormData) {
  const token = String(formData.get("t") ?? "");
  const email = await readUnsubscribeToken(token, adminConfig().secret);
  if (!email) redirect("/unsubscribe?error=1");
  await unsubscribe(email);
  redirect(`/unsubscribe?done=1`);
}
