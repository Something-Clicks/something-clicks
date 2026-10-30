import { AttributionCapture } from "@/components/AttributionCapture";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics, gaMeasurementId } from "@/components/GoogleAnalytics";
import { Header } from "@/components/Header";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-royal px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
      <AttributionCapture />
      {/* Read server-side here, not in the root layout, so GA never loads on admin pages. */}
      <GoogleAnalytics measurementId={gaMeasurementId()} />
    </>
  );
}
