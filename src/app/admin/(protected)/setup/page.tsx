import { headers } from "next/headers";
import { CircleAlert, CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";
import { domainChecks, envChecks, liveChecks, type Check, type Status } from "@/lib/setup/checks";
import { sendTestEmail } from "./actions";

export const metadata = { title: "Setup checklist" };

const ORDER = [
  "Vercel environment variables",
  "Database (Supabase)",
  "Database migrations",
  "GitHub Actions",
  "Data loads",
  "Domain",
  "Later (not needed to launch)",
];

const look: Record<Status, { icon: typeof CircleCheck; cls: string; word: string }> = {
  ok: { icon: CircleCheck, cls: "text-success", word: "Done" },
  missing: { icon: CircleAlert, cls: "text-danger", word: "Needs fixing" },
  warn: { icon: TriangleAlert, cls: "text-[#9a6700]", word: "Check" },
  later: { icon: CircleDashed, cls: "text-navy-soft", word: "Later" },
};

const emailNote: Record<string, string> = {
  sent: "Sent. Check your inbox (and spam) for “Something Clicks test email”.",
  failed: "Resend refused it. Check the API key and that the From address's domain is verified in Resend.",
  unconfigured: "Set RESEND_API_KEY and NOTIFY_EMAIL_FROM first.",
};

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const checks = [...envChecks(), ...(await liveChecks()), ...domainChecks((await headers()).get("host"))];
  const launch = checks.filter((c) => c.status !== "later");
  const done = launch.filter((c) => c.status === "ok").length;

  return (
    <>
      <h1 className="text-3xl">Setup checklist</h1>
      <p className="mt-2 text-navy-soft">Everything production needs, checked live each time you open this page. Values are never shown.</p>
      <p className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold ${done === launch.length ? "bg-[#E8F7EE] text-success" : "bg-white ring-1 ring-line"}`}>
        {done === launch.length ? "Ready to launch" : `${done} of ${launch.length} ready`}
      </p>

      {ORDER.map((group) => {
        const items = checks.filter((c) => c.group === group);
        if (!items.length) return null;
        return (
          <section key={group} className="mt-8" aria-labelledby={`g-${group}`}>
            <h2 id={`g-${group}`} className="text-xl">{group}</h2>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-white ring-1 ring-line">
              {items.map((c) => <Item key={c.label} c={c} />)}
              {group === "Vercel environment variables" && (
                <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <span className="text-sm">
                    <strong>Email delivery</strong>{" "}
                    <span className="text-navy-soft">{email && emailNote[email] ? emailNote[email] : "Sends a test to ADMIN_EMAIL through Resend."}</span>
                  </span>
                  <form action={sendTestEmail}>
                    <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-semibold text-royal ring-1 ring-line hover:bg-ice">Send test email</button>
                  </form>
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function Item({ c }: { c: Check }) {
  const { icon: Icon, cls, word } = look[c.status];
  return (
    <li className="flex items-start gap-3 px-5 py-3">
      <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${cls}`} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="break-all font-mono text-sm font-semibold">{c.label}</span>
          <span className={`text-xs font-semibold ${cls}`}>{word}</span>
        </p>
        {c.detail && <p className="text-sm text-navy-soft">{c.detail}</p>}
        {c.fix && c.status === "later" && <p className="text-sm text-navy-soft">{c.fix}</p>}
        {c.fix && c.status !== "ok" && c.status !== "later" && <p className="text-sm"><span className="font-semibold">Fix:</span> {c.fix}</p>}
      </div>
    </li>
  );
}
