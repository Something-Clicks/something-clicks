import Link from "next/link";
import { site } from "@/content/site";
import { LogoPlaceholder } from "./LogoPlaceholder";

const columns = [
  {
    title: "Something Clicks",
    links: [
      { href: "/#find", label: "Find my matches" },
      { href: "/claim", label: "Claim your business" },
      { href: "/sign-in", label: "Sign in" },
      { href: "/referral-partners", label: "Referral partners" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Your data",
    links: [
      { href: "/data-sources", label: "Data sources" },
      { href: "/remove-my-business", label: "Remove my business" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-navy text-white on-dark">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <LogoPlaceholder tone="dark" />
          <p className="mt-4 max-w-sm text-lg text-white">{site.brandLine}</p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title === "Your data" ? "Your data" : "Footer"}>
            <h2 className="text-sm font-semibold text-white">{c.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-mist hover:text-white">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-xs text-mist">
          © {new Date().getFullYear()} {site.legalName}. Business listings include data from the{" "}
          <Link href="/data-sources" className="underline hover:text-white">Overture Maps Foundation</Link>.
        </p>
      </div>
    </footer>
  );
}
