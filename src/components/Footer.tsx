import Link from "next/link";
import { nav, site } from "@/content/site";
import { LogoPlaceholder } from "./LogoPlaceholder";

export function Footer() {
  return (
    <footer className="bg-navy text-white on-dark">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <LogoPlaceholder tone="dark" />
          <p className="mt-4 max-w-sm text-sm text-mist">{site.mission}</p>
        </div>
        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold text-white">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[...nav, { href: "/join", label: "Apply" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-mist hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold text-white">Contact</h2>
          <ul className="mt-3 space-y-2 text-sm text-mist">
            <li>
              <Link href="/contact" className="hover:text-white">
                Contact form
              </Link>
            </li>
            <li>{site.region}</li>
            <li>
              <Link href="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-white">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-xs text-mist">
          © {new Date().getFullYear()} {site.legalName}. The Something Clicks Network is in a founding pilot; results are
          not guaranteed.
        </p>
      </div>
    </footer>
  );
}
