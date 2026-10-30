import Link from "next/link";
import { ContactForm } from "@/components/forms/ContactForm";
import { P } from "@/components/Placeholder";
import { site } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Contact",
  path: "/contact",
  description: "Questions about Something Clicks, claiming your business, or referral partnerships? A real person will reply.",
});

const shortcuts = [
  { href: "/claim", title: "Claim your business", body: "Find it and verify it in a minute." },
  { href: "/remove-my-business", title: "Remove a business", body: "Take a listing out of Something Clicks." },
  { href: "/referral-partners", title: "Refer businesses", body: "For planners, coordinators and other connectors." },
];

export default function ContactPage() {
  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-16 sm:py-24">
          <h1 className="text-5xl sm:text-6xl">Let&rsquo;s talk.</h1>
          <p className="mt-5 max-w-xl text-xl text-mist">
            A real person reads every message and replies <P value={site.responseWindow} />.
          </p>
        </div>
      </section>
      <section className="bg-white py-16 sm:py-20">
        <div className="container-page grid gap-12 md:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="text-2xl">Looking for something quick?</h2>
            <ul className="mt-6 space-y-3">
              {shortcuts.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="block rounded-2xl bg-cloud p-5 hover:bg-ice">
                    <span className="block font-semibold text-royal">{s.title}</span>
                    <span className="block text-navy-soft">{s.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl">Send a message</h2>
            <div className="mt-6"><ContactForm /></div>
          </div>
        </div>
      </section>
    </>
  );
}
