"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { recomputeMatches, saveCluster, setServesJourney, updateMatch } from "@/lib/network/admin";

const num = (min: number, max: number) => z.coerce.number().min(min).max(max);

const clusterSchema = z
  .object({
    slug: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, "Use 3–60 lowercase letters, numbers, and dashes."),
    name: z.string().trim().min(2).max(120),
    journey_id: z.string().min(1),
    min_lng: num(-180, 180),
    min_lat: num(-90, 90),
    max_lng: num(-180, 180),
    max_lat: num(-90, 90),
    distance_scale_km: num(1, 200),
    max_match_km: num(1, 300),
    min_confidence: num(0, 1),
    status: z.enum(["draft", "importing", "active", "paused"]),
  })
  .refine((c) => c.min_lng < c.max_lng && c.min_lat < c.max_lat, "The bounding box's minimums must be below its maximums.");

export type ClusterFormState = { error?: string };

export async function saveClusterAction(_prev: ClusterFormState, formData: FormData): Promise<ClusterFormState> {
  await requireAdmin();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const parsed = clusterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the fields." };
  let savedId: number;
  try {
    savedId = await saveCluster(id, parsed.data);
  } catch (e) {
    const msg = e instanceof Error && /clusters_slug_key/.test(e.message) ? "That slug is already used." : "Could not save the cluster.";
    return { error: msg };
  }
  revalidatePath("/admin/network");
  redirect(`/admin/network/clusters/${savedId}?saved=1`);
}

export async function recomputeAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("cluster_id"));
  const n = await recomputeMatches(id);
  revalidatePath("/admin/network");
  redirect(`/admin/network/clusters/${id}?recomputed=${n}`);
}

const back = (formData: FormData) => String(formData.get("back") ?? "/admin/network/explorer").replace(/^(?!\/admin\/network\/).*/, "/admin/network/explorer");

export async function matchStatusAction(formData: FormData) {
  await requireAdmin();
  const status = z.enum(["suggested", "approved", "hidden"]).parse(formData.get("status"));
  await updateMatch(Number(formData.get("place_a")), Number(formData.get("place_b")), { status });
  redirect(back(formData));
}

export async function matchRationaleAction(formData: FormData) {
  await requireAdmin();
  const text = String(formData.get("rationale") ?? "").trim().slice(0, 300);
  await updateMatch(Number(formData.get("place_a")), Number(formData.get("place_b")), { rationale: text || null });
  redirect(back(formData));
}

export async function servesJourneyAction(formData: FormData) {
  await requireAdmin();
  const v = String(formData.get("value"));
  await setServesJourney(Number(formData.get("place_id")), v === "yes" ? true : v === "no" ? false : null);
  redirect(back(formData));
}
