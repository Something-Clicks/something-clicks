import type { Metadata } from "next";
import { Globe, Mail, Phone, User } from "lucide-react";
import { DashboardShell } from "@/components/members/DashboardShell";
import { NoBusiness } from "@/components/members/NoBusiness";
import { Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { formatPhone } from "@/content/network";
import { loadDashboard } from "@/lib/members/dashboard";
import { introductionsFor, type IntroRow } from "@/lib/members/network";
import { respondIntroAction } from "../actions";
import { readiness } from "@/lib/readiness";

export const metadata: Metadata = { title: "Introduction requests", robots: { index: false } };

type Search = { place?: string; done?: string; error?: string };

const done: Record<string, string> = {
  accepted: "You're connected. You can see each other's contact details now.",
  declined: "Declined. Nothing was shared.",
};

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Search> }) {
  // The layout shows "coming soon" until accounts are live; don't query tables that may not exist yet.
  if (!(await readiness()).members) return null;
  const sp = await searchParams;
  const ctx = await loadDashboard("/dashboard/requests", sp.place);
  if (ctx.kind === "none") return <NoBusiness email={ctx.member.email} pending={ctx.pending} />;
  const intros = await introductionsFor(ctx.place.id);
  const waitingOnMe = intros.filter((i) => i.incoming && i.status === "requested");
  const connected = intros.filter((i) => i.status === "connected");
  const sent = intros.filter((i) => !i.incoming && i.status !== "connected");

  return (
    <DashboardShell active="/dashboard/requests" place={ctx.place} places={ctx.places} incoming={ctx.incoming}>
      {sp.error && <Notice>{sp.error}</Notice>}
      {sp.done && done[sp.done] && <Notice tone="success">{done[sp.done]}</Notice>}

      <Group title="Waiting for you" empty="No new requests.">
        {waitingOnMe.map((i) => (
          <Row key={i.id} i={i}>
            {i.note && <p className="mt-3 rounded-lg bg-cloud p-3">&ldquo;{i.note}&rdquo;</p>}
            <p className="mt-3 text-sm text-navy-soft">If you accept, you&rsquo;ll both see each other&rsquo;s contact details.</p>
            <form action={respondIntroAction} className="mt-4 flex flex-wrap gap-3">
              <input type="hidden" name="place_id" value={ctx.place.id} />
              <input type="hidden" name="intro_id" value={i.id} />
              <SubmitButton name="decision" value="accept" pendingLabel="Saving…">Accept</SubmitButton>
              <SubmitButton name="decision" value="decline" variant="quiet" pendingLabel="Saving…">Not now</SubmitButton>
            </form>
          </Row>
        ))}
      </Group>

      <Group title="Connected" empty="When a request is accepted, contact details appear here.">
        {connected.map((i) => (
          <Row key={i.id} i={i}>
            <dl className="mt-4 grid gap-2 sm:grid-cols-2">
              {i.contact_name && <Detail icon={User} label="Contact">{i.contact_name}</Detail>}
              {i.contact_email && <Detail icon={Mail} label="Email"><a href={`mailto:${i.contact_email}`} className="text-navy underline">{i.contact_email}</a></Detail>}
              {i.contact_phone && <Detail icon={Phone} label="Phone"><a href={`tel:${i.contact_phone}`} className="text-navy underline">{formatPhone(i.contact_phone)}</a></Detail>}
              {i.website && <Detail icon={Globe} label="Website"><a href={i.website} rel="noopener noreferrer" target="_blank" className="break-all text-navy underline">{i.website}</a></Detail>}
            </dl>
          </Row>
        ))}
      </Group>

      <Group title="You asked" empty="Request an introduction from your matches.">
        {sent.map((i) => (
          <Row key={i.id} i={i}>
            <p className="mt-2 text-sm font-semibold text-navy-soft">{i.status === "requested" ? "Waiting for them to respond" : "Not right now"}</p>
          </Row>
        ))}
      </Group>
    </DashboardShell>
  );
}

function Group({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mt-8 first:mt-0" aria-label={title}>
      <h2 className="text-2xl">{title}</h2>
      {children.length ? <ul className="mt-4 space-y-4">{children}</ul> : <p className="mt-2 text-navy-soft">{empty}</p>}
    </section>
  );
}

function Row({ i, children }: { i: IntroRow; children: React.ReactNode }) {
  return (
    <li className="rounded-2xl bg-white p-6 ring-1 ring-line">
      <h3 className="text-xl">{i.other_name}</h3>
      <p className="text-sm text-navy-soft">{[i.other_category, i.other_locality].filter(Boolean).join(" · ")}</p>
      {children}
    </li>
  );
}

function Detail({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-navy-soft" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
