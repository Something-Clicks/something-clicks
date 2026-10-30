import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "onDark";

const variants: Record<Variant, string> = {
  primary: "bg-royal text-white hover:bg-[#1f45e0] shadow-sm",
  secondary: "bg-white text-royal ring-1 ring-inset ring-royal hover:bg-ice",
  onDark: "bg-white text-navy hover:bg-ice",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

type Tone = "white" | "cloud" | "ice" | "navy";
const tones: Record<Tone, string> = {
  white: "bg-white",
  cloud: "bg-cloud",
  ice: "bg-ice",
  navy: "bg-navy text-white on-dark",
};

export function Section({
  tone = "white",
  className = "",
  children,
  ...props
}: ComponentProps<"section"> & { tone?: Tone }) {
  return (
    <section className={`${tones[tone]} py-16 sm:py-24 ${className}`} {...props}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  id,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  id?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 id={id} className="mt-2 text-3xl sm:text-4xl">
        {title}
      </h2>
      {intro && <div className="mt-4 text-lg text-navy-soft [.on-dark_&]:text-mist">{intro}</div>}
    </div>
  );
}

/** Required on every example partnership: examples are not real members. */
export function IllustrativeTag() {
  return (
    <span className="inline-flex items-center rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-navy-soft ring-1 ring-line">
      Illustrative example
    </span>
  );
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-2xl bg-white p-6 ring-1 ring-line ${className}`} {...props} />;
}

export function PageHero({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  intro: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="bg-navy text-white on-dark relative overflow-hidden">
      <HeroLines />
      <div className="container-page relative py-16 sm:py-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-4xl sm:text-5xl">{title}</h1>
        <div className="mt-5 max-w-2xl text-lg text-mist">{intro}</div>
        {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}

/** Decorative background: two arcs converging on a cyan point (no meaning conveyed). */
export function HeroLines() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-24 top-1/2 hidden h-[520px] w-[720px] -translate-y-1/2 opacity-60 md:block"
      viewBox="0 0 720 520"
      fill="none"
    >
      <path d="M40 470 C 260 470, 330 260, 470 260" stroke="#2853FB" strokeWidth="2" />
      <path d="M40 50 C 260 50, 330 260, 470 260" stroke="#209AFD" strokeWidth="2" />
      <path d="M470 260 H 720" stroke="#C7D2E6" strokeWidth="2" strokeDasharray="4 8" />
      <circle cx="470" cy="260" r="9" fill="#209AFD" />
      <circle cx="470" cy="260" r="22" stroke="#209AFD" strokeOpacity="0.4" strokeWidth="2" />
    </svg>
  );
}
