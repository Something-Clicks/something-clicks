import Link from "next/link";
import { metros } from "@/content/metros";
import { site } from "@/content/site";
import { Logo } from "./Logo";

const columns = [
  {
    title: "Something Clicks",
    links: [
      { href: "/#find", label: "Find my matches" },
      { href: "/claim", label: "Claim your business" },
      { href: "/sign-in", label: "Sign in" },
      { href: "/referral-partners", label: "Referral partners" },
      { href: "/planner-partners", label: "Planner Partners" },
      { href: "/faq", label: "FAQ" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Cities",
    links: metros.map((m) => ({ href: `/weddings/${m.slug}`, label: m.name })),
  },
  {
    title: "Your data",
    links: [
      { href: "/remove-my-business", label: "Remove my business" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-navy text-white on-dark">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="dark" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist">{site.about}</p>
        </div>
        {columns.map((c) => (
          <nav key={c.title} aria-label={c.title === "Something Clicks" ? "Footer" : c.title}>
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
        <p className="container-page flex flex-wrap gap-x-3 py-5 text-xs text-mist">
          <span>© {new Date().getFullYear()} {site.legalName}</span>
          {/* Full Overture Maps attribution lives on /data-sources. */}
          <Link href="/data-sources" className="hover:text-white hover:underline">Data sources</Link>
        </p>
      </div>
    </footer>
  );
}
