"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { site } from "@/content/site";
import { requireAdmin } from "@/lib/admin-auth";
import { sql } from "@/lib/db";
import { sendEmail, simpleEmail } from "@/lib/mailer";
import { approveClaim, rejectClaim } from "@/lib/members/claims";

async function claimant(claimId: number) {
  const [row] = await sql()<{ email: string; name: string }[]>`
    select pc.email, coalesce(p.name, pc.new_business->>'name') as name
    from place_claims pc left join places p on p.id = pc.place_id where pc.id = ${claimId}`;
  return row;
}

export async function approveClaimAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("claim_id"));
  const r = await approveClaim(id);
  if (r.ok) {
    const c = await claimant(id);
    await sendEmail({
      to: c.email,
      subject: `${c.name} is verified on Something Clicks`,
      ...simpleEmail({
        heading: "You're verified.",
        lines: [`We approved your claim for ${c.name}. Your matches are ready.`],
        button: { label: "See your matches", url: `${site.url}/dashboard/profile?welcome=1` },
      }),
    }).catch((e) => console.error("[claims] approval email failed", e));
  }
  revalidatePath("/admin/network/claims");
  redirect(`/admin/network/claims?${new URLSearchParams(r.ok ? { done: "approved" } : { error: r.error })}`);
}

export async function rejectClaimAction(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("claim_id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  await rejectClaim(id, note);
  const c = await claimant(id);
  if (c && formData.get("tell") === "on") {
    await sendEmail({
      to: c.email,
      subject: `About your claim for ${c.name}`,
      ...simpleEmail({
        heading: "We couldn't confirm your claim.",
        lines: [
          `We weren't able to confirm that you run ${c.name}.`,
          ...(note ? [note] : []),
          "If you think that's a mistake, reply through our contact form and we'll take another look.",
        ],
        button: { label: "Contact us", url: `${site.url}/contact` },
      }),
    }).catch((e) => console.error("[claims] rejection email failed", e));
  }
  revalidatePath("/admin/network/claims");
  redirect("/admin/network/claims?done=rejected");
}
