"use server";

import { redirect } from "next/navigation";
import { categoryById } from "@/content/journeys";
import { getMember, sendSignInLink } from "@/lib/members/auth";
import { getClaimableByRef, isListingRef, onSignIn, startClaim, type ClaimStart, type NewBusiness } from "@/lib/members/claims";
import { claimsOpen } from "@/lib/readiness";
import { allow, validEmail } from "@/lib/members/limits";
import { validLink } from "@/lib/members/network";
import { resolveLocation } from "@/lib/network/search";
import { cleanTerm, liveVocabulary, logUnmatched, mappedCategory } from "@/lib/network/vocabulary";

const text = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

/** After a claim is recorded: signed in with the same address, it applies now; otherwise the emailed link finishes it. */
async function finish(result: ClaimStart, email: string, back: (e: string) => never): Promise<never> {
  if (result.status === "owned") return back("owned");
  if (result.status === "invalid") return back("email");
  const method = result.method;
  const member = await getMember();
  if (member && member.email === email) {
    await onSignIn(member);
    redirect(method === "email_domain" ? "/dashboard/profile?welcome=1" : "/dashboard");
  }
  await sendSignInLink(
    email,
    method === "email_domain" ? "/dashboard/profile?welcome=1" : "/dashboard",
    method === "email_domain"
      ? "Open this link to verify your business and see your matches."
      : "Open this link to confirm your email. Then we'll review your claim.",
  );
  const qs = new URLSearchParams({ m: method });
  if (process.env.NODE_ENV === "development") qs.set("dev", email);
  redirect(`/claim/sent?${qs}`);
}

export async function claimPlace(formData: FormData) {
  const ref = text(formData, "place_ref", 40);
  const email = text(formData, "email", 254).toLowerCase();
  const back = (error: string): never => redirect(`/claim/${ref}?error=${error}`);
  if (!claimsOpen() || !isListingRef(ref)) redirect("/claim");
  const listing = await getClaimableByRef(ref);
  if (!listing) redirect("/claim");
  const placeId = listing.id;
  if (!validEmail(email)) return back("email");
  if (!(await allow("claim", 3600, 5))) return back("limit");
  await finish(await startClaim({ placeId, email, note: text(formData, "note", 500) }), email, back);
}

export async function addBusiness(formData: FormData) {
  if (!claimsOpen()) redirect("/claim");
  const fields = {
    name: text(formData, "name", 120),
    category_id: text(formData, "category", 60),
    other: text(formData, "other", 80),
    website: text(formData, "website", 300),
    where: text(formData, "where", 80),
    service_area: text(formData, "service_area", 200),
    email: text(formData, "email", 254).toLowerCase(),
    note: text(formData, "note", 500),
  };
  // Keep what they typed (except the email) so a correction doesn't mean starting over.
  const back = (error: string): never => {
    const { email: _email, ...keep } = fields;
    void _email;
    return redirect(`/claim/new?${new URLSearchParams({ ...keep, error })}`);
  };
  if (fields.name.length < 2) return back("name");
  // "Something else": keep what they do so the business can get a category once one exists.
  let categoryId = fields.category_id;
  let unmatchedTerm: string | undefined;
  if (categoryId === "other") {
    const term = cleanTerm(fields.other);
    if (!term) return back("other");
    const vocab = await liveVocabulary();
    const mapped = await mappedCategory(term);
    if (mapped) categoryId = mapped;
    else if (vocab.some((v) => v.id === term)) categoryId = term;
    else {
      categoryId = "";
      unmatchedTerm = term;
      await logUnmatched(term);
    }
  } else if (!categoryById(categoryId) && !(await liveVocabulary()).some((v) => v.id === categoryId)) {
    return back("category");
  }
  const website = fields.website && !/^https?:\/\//i.test(fields.website) ? `https://${fields.website}` : fields.website;
  if (!validLink(website)) return back("website");
  if (!validEmail(fields.email)) return back("email");
  if (!(await allow("claim", 3600, 5))) return back("limit");
  const location = await resolveLocation(fields.where);
  if (location.status !== "found") return back("where");
  const place = location.place;
  const [locality, region = ""] = place.label.startsWith("ZIP ") ? [place.label, ""] : place.label.split(", ");
  const business: NewBusiness = {
    name: fields.name,
    category_id: categoryId,
    ...(unmatchedTerm ? { unmatched_term: unmatchedTerm } : {}),
    website,
    service_area: fields.service_area,
    locality,
    region,
    lat: place.lat,
    lng: place.lng,
  };
  await finish(await startClaim({ newBusiness: business, email: fields.email, note: fields.note }), fields.email, back);
}
