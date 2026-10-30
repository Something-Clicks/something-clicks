import Script from "next/script";

/**
 * Google Analytics 4. Loads only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set.
 * Google signals and ad personalization are off; GA sets first-party cookies
 * (disclosed in the Privacy Policy). Not loaded on admin pages.
 */
export const gaMeasurementId = () => {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
  return /^G-[A-Z0-9]{4,}$/.test(id) ? id : null;
};

export function GoogleAnalytics() {
  const id = gaMeasurementId();
  if (!id) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}',{allow_google_signals:false,allow_ad_personalization_signals:false});`}
      </Script>
    </>
  );
}
