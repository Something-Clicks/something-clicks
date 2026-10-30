import { NetworkNav } from "@/components/admin/NetworkNav";
import { NetworkNotConfigured } from "@/components/admin/NotConfigured";
import { site } from "@/content/site";
import { adminConfig } from "@/lib/admin-auth";
import { dbConfigured } from "@/lib/db";
import { clusterInvite, mailingAddress, memberInvite, sendingBlockers, unsubscribeToken, type Rendered } from "@/lib/invitations";
import { inviteAudience, inviteSample } from "@/lib/network/invitations-admin";

/** Template review only. There is no send button: sending is built in phase 3, after these are approved. */
export default async function InvitationsPage() {
  if (!dbConfigured()) return <NetworkNotConfigured />;
  const [audience, sample] = await Promise.all([inviteAudience(), inviteSample("dfw-weddings")]);
  const blockers = sendingBlockers();
  const token = await unsubscribeToken("preview@example.com", adminConfig().secret);
  const common = { to: "preview@example.com", siteUrl: site.url, unsubscribeToken: token, address: mailingAddress(), preview: true };
  const cluster = sample
    ? clusterInvite({ ...common, business: sample.name, count: sample.count, city: sample.locality, examples: sample.examples, claimPath: `/claim/${sample.id}` })
    : null;
  const member = memberInvite({
    ...common,
    business: sample?.name ?? "Bluebonnet Florals",
    fromBusiness: "6 Carr Photography",
    fromCategory: "Photographer",
    fromCity: "Fort Worth",
    note: "We work a lot of the same weddings. Would love to swap referrals.",
    claimPath: sample ? `/claim/${sample.id}` : "/claim",
  });

  return (
    <>
      <NetworkNav active="/admin/network/invitations" />
      <h1 className="text-3xl">Invitations</h1>
      <div role="note" className="mt-4 rounded-2xl bg-[#fff4d6] p-5 ring-1 ring-[#e0b44a]">
        <p className="font-semibold">Sending is off. Nothing on this page sends email.</p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {blockers.map((b) => <li key={b}>{b}</li>)}
          <li>Batch sending (with your approval of each batch) is part of phase 3. These templates are for your review and legal review first.</li>
        </ul>
      </div>

      <h2 className="mt-8 text-xl">Who a cluster invitation could reach</h2>
      <p className="mt-1 text-sm text-navy-soft">Wedding-specific businesses nobody has claimed, with an imported email that hasn&rsquo;t unsubscribed.</p>
      <table className="mt-3 w-full max-w-xl text-sm">
        <thead><tr className="text-left"><th className="py-2">Cluster</th><th className="py-2 text-right">With email</th><th className="py-2 text-right">Listed</th></tr></thead>
        <tbody>
          {audience.map((a) => (
            <tr key={a.slug} className="border-t border-line">
              <td className="py-2">{a.name}</td>
              <td className="py-2 text-right tabular-nums">{a.with_email.toLocaleString()}</td>
              <td className="py-2 text-right tabular-nums">{a.listed.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {cluster && <Preview title="Cluster invitation" note={`Previewed with a real DFW listing: ${sample!.name}, ${sample!.count} live matches.`} r={cluster} />}
      <Preview title="Member invite" note="Sent when a member presses Invite on a match that isn't on Something Clicks yet." r={member} />
    </>
  );
}

function Preview({ title, note, r }: { title: string; note: string; r: Rendered }) {
  return (
    <section className="mt-10" aria-label={title}>
      <h2 className="text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-navy-soft">{note}</p>
      <div className="mt-4 grid gap-6 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
          <p className="border-b border-line px-5 py-3 text-sm">
            <span className="text-navy-soft">From:</span> Something Clicks · <span className="text-navy-soft">Subject:</span> <strong>{r.subject}</strong>
          </p>
          <iframe title={`${title} preview`} srcDoc={r.html} sandbox="" className="h-[560px] w-full bg-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Plain-text version</h3>
          <pre className="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-5 text-sm ring-1 ring-line">{r.text}</pre>
          <h3 className="mt-4 text-sm font-semibold">Headers</h3>
          <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-5 text-xs ring-1 ring-line">
            {Object.entries(r.headers).map(([k, v]) => `${k}: ${v}`).join("\n")}
          </pre>
        </div>
      </div>
    </section>
  );
}
