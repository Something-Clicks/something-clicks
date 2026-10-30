import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { site } from "@/content/site";
import "./globals.css";

const inter = localFont({
  src: "./fonts/InterVariable-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  // [PLACEHOLDER] favicon: replace public/icon.svg with the real logo mark.
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#15263D" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        {/* Vercel Web Analytics: cookieless page views. Enable it in the Vercel project. */}
        <Analytics />
      </body>
    </html>
  );
}
