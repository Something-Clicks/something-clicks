import Image from "next/image";
import Link from "next/link";

/**
 * The official logo (public/brand): the full lockup, navy and blue on light
 * surfaces, white and blue on dark ones, or all navy where it should stay quiet (the footer).
 */
export function Logo({ tone = "light" }: { tone?: "light" | "dark" | "navy" }) {
  return (
    <Link href="/" className="inline-flex items-center" aria-label="Something Clicks home">
      {tone === "navy" ? (
        <Image src="/brand/logo-navy.svg" alt="" width={143} height={32} unoptimized className="h-8 w-auto" />
      ) : tone === "dark" ? (
        <Image src="/brand/logo-on-dark.svg" alt="" width={143} height={32} unoptimized className="h-8 w-auto" />
      ) : (
        <Image src="/brand/logo.svg" alt="" width={143} height={32} unoptimized priority className="h-8 w-auto" />
      )}
    </Link>
  );
}
