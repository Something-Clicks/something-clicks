/**
 * Email-domain verification: an address at the business's own website domain,
 * opened from the emailed link, proves the claimant works there.
 */

/** Free and ISP mailboxes: anyone can get one, so they never prove ownership. */
const FREE_EMAIL = new Set(
  `gmail.com googlemail.com yahoo.com ymail.com rocketmail.com hotmail.com outlook.com live.com msn.com aol.com aim.com
   icloud.com me.com mac.com protonmail.com proton.me pm.me gmx.com gmx.us mail.com yandex.com zoho.com fastmail.com
   hey.com tutanota.com comcast.net att.net sbcglobal.net bellsouth.net verizon.net cox.net charter.net spectrum.net
   earthlink.net frontier.com windstream.net centurylink.net q.com optonline.net juno.com netzero.net`.split(/\s+/),
);

/** Website hosts shared by many businesses: an address there proves nothing about one business. */
const SHARED_HOSTS = [
  "squarespace.com", "wixsite.com", "wix.com", "weebly.com", "wordpress.com", "godaddysites.com", "business.site",
  "facebook.com", "instagram.com", "tiktok.com", "theknot.com", "weddingwire.com", "zola.com", "google.com", "linktr.ee",
  "yelp.com", "square.site", "myshopify.com", "carrd.co", "etsy.com", "blogspot.com", "webflow.io", "vercel.app",
  "netlify.app", "github.io", "canva.site", "honeybook.com", "pixieset.com", "smugmug.com", "showit.site",
];

const onHost = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function emailDomain(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^[^\s@]+@([a-z0-9-]+(?:\.[a-z0-9-]+)+)$/);
  return m ? m[1] : null;
}

/** "https://www.SmithPhoto.com/about" -> "smithphoto.com"; null when there's no usable website. */
export function websiteDomain(website: string): string | null {
  const raw = website.trim();
  if (!raw) return null;
  try {
    const host = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.toLowerCase().replace(/^www\./, "");
    if (!host.includes(".") || SHARED_HOSTS.some((d) => onHost(host, d))) return null;
    return host;
  } catch {
    return null;
  }
}

export const isFreeEmail = (email: string) => {
  const d = emailDomain(email);
  return d !== null && FREE_EMAIL.has(d);
};

/** True when the address is at the website's domain (or the website is a subdomain of the address's domain). */
export function emailMatchesWebsite(email: string, website: string): boolean {
  const ed = emailDomain(email);
  const wd = websiteDomain(website);
  if (!ed || !wd || FREE_EMAIL.has(ed) || SHARED_HOSTS.some((d) => onHost(ed, d))) return false;
  return onHost(wd, ed) || onHost(ed, wd);
}
