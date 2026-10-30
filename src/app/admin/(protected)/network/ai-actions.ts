"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { acceptCategory, runRationales, runReview } from "@/lib/ai/jobs";
import { getProvider } from "@/lib/ai/provider";
import { setServesJourney } from "@/lib/network/admin";

const SIZES = { review: [100, 250], rationale: [250, 500] } as const;

export async function runAiAction(formData: FormData) {
  await requireAdmin();
  const job = formData.get("job") === "rationale" ? "rationale" : "review";
  const size = Number(formData.get("size"));
  if (!(SIZES[job] as readonly number[]).includes(size)) throw new Error("Unknown batch size");
  const provider = getProvider();
  if (!provider) redirect("/admin/network/ai?error=off");
  let r;
  try {
    r = job === "review" ? await runReview(provider, size) : await runRationales(provider, size);
  } catch (e) {
    console.error("[ai] run failed", e);
    redirect(`/admin/network/ai?error=${encodeURIComponent(e instanceof Error ? e.message.slice(0, 120) : "failed")}`);
  }
  revalidatePath("/admin/network/ai");
  redirect(`/admin/network/ai?${new URLSearchParams({ done: job, items: String(r.items), applied: String(r.applied), usd: r.costUsd.toFixed(4), ...(r.stopped ? { stopped: r.stopped } : {}) })}`);
}

export async function acceptCategoryAction(formData: FormData) {
  await requireAdmin();
  await acceptCategory(Number(formData.get("place_id")));
  revalidatePath("/admin/network/ai");
}

export async function overrideServesAction(formData: FormData) {
  await requireAdmin();
  const v = formData.get("value");
  await setServesJourney(Number(formData.get("place_id")), v === "yes" ? true : v === "no" ? false : null);
  revalidatePath("/admin/network/ai");
}
