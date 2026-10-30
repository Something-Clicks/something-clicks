import Link from "next/link";

/**
 * [PLACEHOLDER] Temporary logo. Replace this component with Matt's logo file
 * (SVG preferred) once supplied. Do not ship a designed mark in its place.
 */
export function LogoPlaceholder({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Something Clicks home">
      <span
        aria-hidden="true"
        title="Temporary logo placeholder"
        data-placeholder="logo"
        className={`grid h-9 w-9 place-items-center rounded-md border-2 border-dashed text-[9px] font-semibold uppercase tracking-wider ${
          dark ? "border-mist text-mist" : "border-navy-soft text-navy-soft"
        }`}
      >
        Logo
      </span>
      <span className={`text-lg font-semibold tracking-tight ${dark ? "text-white" : "text-navy"}`}>
        Something Clicks
      </span>
    </Link>
  );
}
