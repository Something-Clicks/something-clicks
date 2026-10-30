import Link from "next/link";

const links = [
  { href: "/admin/network", label: "Clusters" },
  { href: "/admin/network/explorer", label: "Match explorer" },
  { href: "/admin/network/imports", label: "Imports" },
  { href: "/admin/network/claims", label: "Claims" },
  { href: "/admin/network/removals", label: "Removals" },
  { href: "/admin/network/invitations", label: "Invitations" },
];

export function NetworkNav({ active }: { active: string }) {
  return (
    <nav aria-label="Network" className="mb-6 flex flex-wrap gap-2">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={active === l.href ? "page" : undefined}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-royal ring-1 ring-line hover:bg-ice aria-[current=page]:bg-royal aria-[current=page]:text-white"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
