import Image from "next/image";
import Link from "next/link";

/**
 * The official logo (public/brand). Light surfaces get the lockup; dark
 * surfaces get the S mark in white and blue.
 */
export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Link href="/" className="inline-flex items-center" aria-label="Something Clicks home">
      {tone === "dark" ? (
        <Image src="/brand/mark-on-dark.svg" alt="" width={48} height={40} unoptimized className="h-10 w-auto" />
      ) : (
        <Image src="/brand/logo.svg" alt="" width={143} height={32} unoptimized priority className="h-8 w-auto" />
      )}
    </Link>
  );
}
