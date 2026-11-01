import { createClient } from "@supabase/supabase-js";
import { metroBySlug } from "@/content/metros";
import { sql } from "@/lib/db";
import type { MemberSession } from "@/lib/members/session";
import { MAX_PHOTO_BYTES, MAX_PHOTOS, MAX_STYLES, PHOTO_TYPES } from "./config";

/**
 * The couple-facing half of a vendor's profile: the same `profiles` row,
 * extended. Every write is scoped to the business the member owns.
 */

export type Photo = { id: number; url: string; alt: string };

export type CoupleProfile = {
  about: string;
  price_from: number | null;
  price_to: number | null;
  markets: string[];
  styles: string[];
  public_visible: boolean;
  public_slug: string | null;
  photos: Photo[];
};

export async function coupleProfile(placeId: number): Promise<CoupleProfile | null> {
  const [row] = await sql()<Omit<CoupleProfile, "photos">[]>`
    select about, price_from, price_to, markets, styles, public_visible, public_slug from profiles where place_id = ${placeId}`;
  if (!row) return null;
  return { ...row, photos: await photosFor(placeId) };
}

export async function photosFor(placeId: number): Promise<Photo[]> {
  return sql()<Photo[]>`select id::int, url, alt from portfolio_photos where place_id = ${placeId} order by position, id`;
}

export type CoupleProfileInput = { about: string; price_from: string; price_to: string; markets: string[]; styles: string };

const money = (s: string): number | null | "bad" => {
  const t = s.replace(/[$,\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : "bad";
};

/** "Boho, classic , modern" -> ["Boho", "Classic", "Modern"]: trimmed, deduplicated, at most 8 short tags. */
export function parseStyles(s: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of s.split(",")) {
    const t = raw.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 30);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t.charAt(0).toUpperCase() + t.slice(1));
    if (out.length === MAX_STYLES) break;
  }
  return out;
}

export async function saveCoupleProfile(member: MemberSession, placeId: number, input: CoupleProfileInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = money(input.price_from);
  const to = money(input.price_to);
  if (from === "bad" || to === "bad") return { ok: false, error: "Prices are whole dollar amounts, like 2500." };
  if (from != null && to != null && to < from) return { ok: false, error: "The top of your price range is below the starting price." };
  const markets = [...new Set(input.markets)].filter((m) => metroBySlug(m));
  const rows = await sql()`
    update profiles set about = ${input.about.slice(0, 1200)}, price_from = ${from}, price_to = ${to},
           markets = ${markets}, styles = ${parseStyles(input.styles)}
    where place_id = ${placeId} and member_id = ${member.id}
    returning place_id`;
  return rows.length ? { ok: true } : { ok: false, error: "Couldn't save." };
}

/** What's still missing before a profile can be shown to couples. Empty when ready. */
export function missingForPublic(p: CoupleProfile, state: string): string[] {
  const missing: string[] = [];
  if (state !== "verified" && state !== "member") missing.push("a verified business");
  if (!p.about.trim()) missing.push("a short “about” section");
  if (!p.photos.length) missing.push("at least one portfolio photo");
  if (!p.markets.length) missing.push("the markets you serve");
  return missing;
}

const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** Turns the public profile on or off. Turning it on needs a complete profile; the URL is created once and kept. */
export async function setVisibility(member: MemberSession, placeId: number, on: boolean): Promise<{ ok: true; slug: string | null } | { ok: false; error: string }> {
  const [owned] = await sql()<{ name: string; locality: string; state: string; public_slug: string | null }[]>`
    select p.name, p.locality, p.state, pr.public_slug from profiles pr join places p on p.id = pr.place_id
    where pr.place_id = ${placeId} and pr.member_id = ${member.id} and not p.suppressed`;
  if (!owned) return { ok: false, error: "Couldn't find that business." };
  if (!on) {
    await sql()`update profiles set public_visible = false where place_id = ${placeId} and member_id = ${member.id}`;
    return { ok: true, slug: owned.public_slug };
  }
  const profile = await coupleProfile(placeId);
  const missing = profile ? missingForPublic(profile, owned.state) : ["a profile"];
  if (missing.length) return { ok: false, error: `Add ${missing.join(", ")} first.` };
  let slug = owned.public_slug;
  if (!slug) {
    const base = slugify([owned.name, owned.locality].filter(Boolean).join(" ")) || `vendor-${placeId}`;
    const taken = new Set(
      (await sql()<{ public_slug: string }[]>`select public_slug from profiles where public_slug like ${base + "%"}`).map((r) => r.public_slug),
    );
    slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  }
  await sql()`
    update profiles set public_visible = true, public_slug = ${slug}, public_since = coalesce(public_since, now())
    where place_id = ${placeId} and member_id = ${member.id}`;
  return { ok: true, slug };
}

// ---------------------------------------------------------------------------
// Photos: stored in the public "portfolio" bucket in Supabase Storage
// ---------------------------------------------------------------------------

export type PhotoStore = { put(path: string, body: ArrayBuffer, type: string): Promise<string>; remove(path: string): Promise<void> };

let testStore: PhotoStore | null = null;
export const setPhotoStoreForTests = (s: PhotoStore | null) => { testStore = s; };

function photoStore(): PhotoStore | null {
  if (testStore) return testStore;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const bucket = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from("portfolio");
  return {
    async put(path, body, type) {
      const { error } = await bucket.upload(path, body, { contentType: type, upsert: false, cacheControl: "31536000" });
      if (error) throw new Error(`photo upload failed: ${error.message}`);
      return bucket.getPublicUrl(path).data.publicUrl;
    },
    async remove(path) {
      await bucket.remove([path]);
    },
  };
}

const ext: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Checks the file's first bytes, not just the type the browser claims. */
function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

export async function addPhoto(member: MemberSession, placeId: number, file: File, alt: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const [owned] = await sql()<{ n: number }[]>`
    select (select count(*)::int from portfolio_photos where place_id = ${placeId}) as n
    from profiles where place_id = ${placeId} and member_id = ${member.id}`;
  if (!owned) return { ok: false, error: "Couldn't find that business." };
  if (owned.n >= MAX_PHOTOS) return { ok: false, error: `You can add up to ${MAX_PHOTOS} photos.` };
  if (!file || file.size === 0) return { ok: false, error: "Choose a photo to upload." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "Photos can be up to 4 MB." };
  const body = await file.arrayBuffer();
  const type = sniff(new Uint8Array(body.slice(0, 12)));
  if (!type || !(PHOTO_TYPES as readonly string[]).includes(type)) return { ok: false, error: "Photos must be JPEG, PNG or WebP." };
  const store = photoStore();
  if (!store) return { ok: false, error: "Photo uploads aren't set up yet." };
  const path = `${placeId}/${crypto.randomUUID()}.${ext[type]}`;
  const url = await store.put(path, body, type);
  await sql()`
    insert into portfolio_photos (place_id, path, url, alt, position)
    values (${placeId}, ${path}, ${url}, ${alt.slice(0, 200)}, ${owned.n})`;
  return { ok: true };
}

export async function removePhoto(member: MemberSession, placeId: number, photoId: number): Promise<void> {
  const [row] = await sql()<{ path: string }[]>`
    delete from portfolio_photos ph using profiles pr
    where ph.id = ${photoId} and ph.place_id = ${placeId} and pr.place_id = ph.place_id and pr.member_id = ${member.id}
    returning ph.path`;
  if (row) await photoStore()?.remove(row.path).catch((e) => console.error("[photos] remove failed", e));
  // A profile with no photos left can't stay public.
  await sql()`
    update profiles set public_visible = false
    where place_id = ${placeId} and member_id = ${member.id} and not exists (select 1 from portfolio_photos where place_id = ${placeId})`;
}
