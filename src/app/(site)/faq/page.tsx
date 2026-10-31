import Link from "next/link";
import { Faq } from "@/components/Faq";
import { faqJsonLd } from "@/content/faq";
import { breadcrumbJsonLd, JsonLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Questions about Something Clicks",
  path: "/faq",
  description:
    "How wedding businesses use Something Clicks to find referral partners, what it costs, who can see your business, and which cities are live.",
});

export default function FaqPage() {
  return (
    <div className="bg-cloud">
      <div className="container-page max-w-3xl py-12 sm:py-16">
        <Faq heading="Questions" headingLevel={1} />
        <p className="mt-8 text-navy-soft">
          Something else? <Link href="/contact" className="font-semibold text-navy underline underline-offset-2">Contact us</Link>.
        </p>
      </div>
      <JsonLd data={[faqJsonLd(), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Questions", path: "/faq" }])]} />
    </div>
  );
}
