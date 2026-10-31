"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { setCampaign } from "@/lib/payments/billing";

export async function campaignAction(formData: FormData) {
  await requireAdmin();
  await setCampaign(Number(formData.get("id")), String(formData.get("status")), String(formData.get("notes") ?? ""));
  revalidatePath("/admin/network/campaigns");
}
