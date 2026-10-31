import Script from "next/script";

/**
 * PromoteKit referral tracking (single tier, manual payouts are set in
 * PromoteKit). Uses the public site id only; the API key stays server-side and
 * isn't needed for this. The script stores the referral as
 * window.promotekit_referral, which checkout passes to Stripe as metadata.promotekit_referral.
 * [CHECK] Script URL and attribute as in PromoteKit's install snippet: confirm against your dashboard.
 */
export function PromoteKit({ siteId }: { siteId?: string }) {
  const id = siteId?.trim();
  if (!id || !/^[A-Za-z0-9_-]{1,100}$/.test(id)) return null;
  return <Script src="https://cdn.promotekit.com/promotekit.js" data-promotekit={id} strategy="afterInteractive" />;
}
