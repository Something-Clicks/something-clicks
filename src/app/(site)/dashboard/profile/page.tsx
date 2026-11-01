import type { Metadata } from "next";
import { DashboardShell } from "@/components/members/DashboardShell";
import { NoBusiness } from "@/components/members/NoBusiness";
import { Field, Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { metros } from "@/content/metros";
import { couplesOpen, MAX_PHOTOS } from "@/lib/couples/config";
import { coupleProfile, missingForPublic, type CoupleProfile } from "@/lib/couples/profile";
import { loadDashboard } from "@/lib/members/dashboard";
import type { OwnedPlace } from "@/lib/members/network";
import { saveProfileAction } from "../actions";
import { addPhotoAction, removePhotoAction, saveCoupleProfileAction, visibilityAction } from "../couples-actions";
import { readiness } from "@/lib/readiness";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

type Search = { place?: string; done?: string; error?: string; welcome?: string };

const doneText: Record<string, string> = {
  saved: "Saved.",
  couples: "Saved.",
  photo: "Photo added.",
  "photo-removed": "Photo removed.",
  public: "Your profile is set to show to couples.",
  hidden: "Your profile is hidden from couples.",
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Search> }) {
  // The layout shows "coming soon" until accounts are live; don't query tables that may not exist yet.
  if (!(await readiness()).members) return null;
  const sp = await searchParams;
  const ctx = await loadDashboard("/dashboard/profile", sp.place);
  if (ctx.kind === "none") return <NoBusiness email={ctx.member.email} pending={ctx.pending} />;
  const p = ctx.place;
  const couples = await coupleProfile(p.id).catch(() => null); // null until the couples migration is applied
  return (
    <DashboardShell active="/dashboard/profile" place={p} places={ctx.places} incoming={ctx.incoming}>
      <div className="max-w-2xl">
        {sp.welcome && <Notice tone="success">You&rsquo;re verified. Confirm a few details and you&rsquo;re done.</Notice>}
        {sp.error && <Notice>{sp.error}</Notice>}
        {sp.done && doneText[sp.done] && <Notice tone="success">{doneText[sp.done]}</Notice>}
        <form action={saveProfileAction} className="mt-6 space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8">
          <input type="hidden" name="place_id" value={p.id} />
          {sp.welcome && <input type="hidden" name="welcome" value="1" />}
          <Field label="What you do, in a sentence" name="description" textarea optional maxLength={500} rows={2} defaultValue={p.description}
                 placeholder="Natural-light wedding photography across North Texas." />
          <Field label="Area you serve" name="service_area" optional maxLength={200} defaultValue={p.service_area} placeholder="Dallas–Fort Worth" />
          <fieldset className="space-y-4">
            <legend className="font-medium">Contact details</legend>
            <p className="text-sm text-navy-soft">Shared only with businesses you connect with, after you both accept.</p>
            <Field label="Name" name="contact_name" optional maxLength={120} autoComplete="name" defaultValue={p.contact_name} />
            <Field label="Email" name="contact_email" type="email" required maxLength={254} autoComplete="email" defaultValue={p.contact_email} />
            <Field label="Phone" name="contact_phone" type="tel" optional maxLength={40} autoComplete="tel" defaultValue={p.contact_phone || p.phone} />
          </fieldset>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-ice p-4">
            <input type="checkbox" name="network_opt_in" defaultChecked={p.network_opt_in || Boolean(sp.welcome)} className="mt-1 h-5 w-5 accent-royal" />
            <span>
              <span className="block font-semibold">Join the network</span>
              <span className="block text-sm text-navy-soft">
                Your matches can request introductions with you, and you with them. You choose who to accept. Turn it off anytime.
              </span>
            </span>
          </label>
          <SubmitButton pendingLabel="Saving…">{sp.welcome ? "Done" : "Save"}</SubmitButton>
        </form>
        {couples && <CouplesSection place={p} profile={couples} />}
      </div>
    </DashboardShell>
  );
}

/** The couple-facing part of the same profile: about, prices, markets, styles, photos, and the visibility toggle. */
function CouplesSection({ place, profile }: { place: OwnedPlace; profile: CoupleProfile }) {
  const missing = missingForPublic(profile, place.state);
  const box = "mt-6 space-y-5 rounded-2xl bg-white p-6 ring-1 ring-line sm:p-8";
  return (
    <>
      <h2 id="couples" className="mt-12 scroll-mt-24 text-2xl">For couples</h2>
      <p className="mt-2 text-navy-soft">What couples see if you show your profile to them. Partner matching doesn&rsquo;t use any of this.</p>
      <form action={saveCoupleProfileAction} className={box}>
        <input type="hidden" name="place_id" value={place.id} />
        <Field label="About your business" name="about" textarea optional maxLength={1200} rows={5} defaultValue={profile.about}
               placeholder="Who you are, how you work, and what couples can expect." />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Starting price ($)" name="price_from" optional inputMode="numeric" maxLength={9} defaultValue={profile.price_from ?? ""} placeholder="2500" />
          <Field label="Up to ($)" name="price_to" optional inputMode="numeric" maxLength={9} defaultValue={profile.price_to ?? ""} placeholder="6000" />
        </div>
        <fieldset>
          <legend className="font-medium">Markets you serve</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {metros.map((m) => (
              <label key={m.slug} className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 ring-1 ring-line has-[:checked]:bg-ice">
                <input type="checkbox" name="markets" value={m.slug} defaultChecked={profile.markets.includes(m.slug)} className="h-4 w-4 accent-royal" />
                {m.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Styles" name="styles" optional maxLength={400} defaultValue={profile.styles.join(", ")}
               hint="Up to 8, separated by commas." placeholder="Classic, documentary, black and white" />
        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      </form>

      <section id="photos" aria-labelledby="photos-heading" className={`${box} scroll-mt-24`}>
        <h3 id="photos-heading" className="text-lg font-semibold">Portfolio photos</h3>
        {profile.photos.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.photos.map((ph) => (
              <li key={ph.id} className="overflow-hidden rounded-xl ring-1 ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ph.url} alt={ph.alt} className="aspect-[4/3] w-full object-cover" />
                <form action={removePhotoAction} className="p-2 text-right">
                  <input type="hidden" name="place_id" value={place.id} />
                  <input type="hidden" name="photo_id" value={ph.id} />
                  <button type="submit" className="text-sm font-semibold text-navy-soft hover:text-navy hover:underline">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-navy-soft">No photos yet.</p>
        )}
        {profile.photos.length < MAX_PHOTOS && (
          <form action={addPhotoAction} className="space-y-4">
            <input type="hidden" name="place_id" value={place.id} />
            <div>
              <label htmlFor="f-photo" className="block font-medium">Add a photo</label>
              <p className="mt-1 text-sm text-navy-soft">JPEG, PNG or WebP, up to 4 MB. Up to {MAX_PHOTOS} photos.</p>
              <input id="f-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-2 block w-full text-sm" />
            </div>
            <Field label="Describe the photo" name="alt" optional maxLength={200} hint="For people using screen readers." placeholder="Couple under an oak tree at sunset" />
            <SubmitButton pendingLabel="Uploading…" variant="secondary">Upload photo</SubmitButton>
          </form>
        )}
      </section>

      <form id="visibility" action={visibilityAction} className={`${box} scroll-mt-24`}>
        <input type="hidden" name="place_id" value={place.id} />
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" name="public_visible" defaultChecked={profile.public_visible} className="mt-1 h-5 w-5 accent-royal" />
          <span>
            <span className="block font-semibold">Show my profile to couples</span>
            <span className="block text-sm text-navy-soft">
              Couples planning a wedding can find your profile and send you inquiries. Only you see their details. Turn it off anytime.
            </span>
          </span>
        </label>
        {missing.length > 0 && !profile.public_visible && <p className="text-sm text-navy-soft">Before you can turn this on, add {missing.join(", ")}.</p>}
        {profile.public_visible && profile.public_slug && (
          <p className="text-sm text-navy-soft">
            {couplesOpen() ? (
              <>Your public profile: <a href={`/vendors/${profile.public_slug}`} className="font-semibold text-navy underline underline-offset-2">somethingclicks.com/vendors/{profile.public_slug}</a></>
            ) : (
              <>Your profile will appear to couples when we open the couples directory in your market.</>
            )}
          </p>
        )}
        <SubmitButton pendingLabel="Saving…" variant="secondary">Save</SubmitButton>
      </form>
    </>
  );
}
