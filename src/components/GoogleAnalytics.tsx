import Script from "next/script";

/**
 * Google Analytics 4 measurement ID, read server-side from GA_MEASUREMENT_ID
 * (no NEXT_PUBLIC_ variable). Returns null unless it looks like a real "G-…" ID.
 */
export const gaMeasurementId = (value = process.env.GA_MEASUREMENT_ID): string | null => {
  const id = (value ?? "").trim();
  return /^G-[A-Z0-9]{4,}$/.test(id) ? id : null;
};

/**
 * Loads GA only when given an ID. Rendered by the public-site layout, never on
 * admin pages. Google signals and ad personalization are off; GA sets
 * first-party cookies (disclosed in the Privacy Policy).
 */
export function GoogleAnalytics({ measurementId }: { measurementId: string | null }) {
  if (!measurementId) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}',{allow_google_signals:false,allow_ad_personalization_signals:false});`}
      </Script>
    </>
  );
}
