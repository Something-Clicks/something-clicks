"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { decideRemoval } from "@/lib/network/removals";

export async function removalAction(formData: FormData) {
  await requireAdmin();
  const decision = String(formData.get("decision"));
  if (decision !== "remove" && decision !== "reject" && decision !== "restore") throw new Error("Unknown decision");
  await decideRemoval(Number(formData.get("id")), decision, Number(formData.get("place_id")) || null);
  revalidatePath("/admin/network/removals");
}
