import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { DashboardShell } from "@/components/members/DashboardShell";
import { NoBusiness } from "@/components/members/NoBusiness";
import { Field, Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { partnershipLabels, type PartnershipType } from "@/content/journeys";
import { consentCopy, site } from "@/content/site";
import { loadDashboard } from "@/lib/members/dashboard";
import { partnershipsFor, type PartnershipRow } from "@/lib/members/network";
import { acceptPartnershipAction, endPartnershipAction, proposeAction } from "../actions";

export const metadata: Metadata = { title: "Partnerships", robots: { index: false } };

type Search = { place?: string; done?: string; error?: string };

const done: Record<string, string> = {
  proposed: "Sent. It goes live when they agree.",
  live: "Your partnership is live. Share your link below.",
  ended: "Partnership ended.",
};

const steps = ["Matched", "Introduced", "Connected", "Partnership live"];

export default async function PartnershipsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const ctx = await loadDashboard("/dashboard/partnerships", sp.place);
  if (ctx.kind === "none") return <NoBusiness email={ctx.member.email} pending={ctx.pending} />;
  const rows = await partnershipsFor(ctx.place.id);

  return (
    <DashboardShell active="/dashboard/partnerships" place={ctx.place} places={ctx.places} incoming={ctx.incoming}>
      {sp.error && <Notice>{sp.error}</Notice>}
      {sp.done && done[sp.done] && <Notice tone="success">{done[sp.done]}</Notice>}
      <h2 className="mt-2 text-2xl">Grow together.</h2>
      <p className="mt-1 text-navy-soft">Set up referrals, a shared offer, or a promotion with a business you&rsquo;re connected to.</p>
      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-8 ring-1 ring-line">
          <p className="text-lg">Partnerships start with a connection.</p>
          <Link href={`/dashboard?place=${ctx.place.id}`} className="mt-4 inline-flex rounded-xl bg-royal px-5 py-3 font-semibold text-white hover:bg-[#1f45e0]">
            See your matches
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-6">
          {rows.map((r) => <Partnership key={r.intro_id} r={r} placeId={ctx.place.id} />)}
        </ul>
      )}
    </DashboardShell>
  );
}

function Progress({ live }: { live: boolean }) {
  const reached = live ? 4 : 3;
  return (
    <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-2 text-sm">
          <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${i < reached ? "bg-royal text-white" : "bg-white ring-2 ring-line"}`}>
            {i < reached && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
          </span>
          <span className={i < reached ? "font-semibold" : "text-navy-soft"}>{s}</span>
          <span className="sr-only">{i < reached ? "(done)" : "(not yet)"}</span>
        </li>
      ))}
    </ol>
  );
}

function Partnership({ r, placeId }: { r: PartnershipRow; placeId: number }) {
  const hidden = (
    <>
      <input type="hidden" name="place_id" value={placeId} />
      <input type="hidden" name="intro_id" value={r.intro_id} />
      {r.partnership_id && <input type="hidden" name="partnership_id" value={r.partnership_id} />}
    </>
  );
  return (
    <li className="rounded-2xl bg-white p-6 ring-1 ring-line">
      <h3 className="text-xl">{r.other_name}</h3>
      <Progress live={r.stage === "live"} />

      {r.stage && r.type && (
        <div className="mt-5 rounded-xl bg-cloud p-4">
          <p className="text-sm font-semibold text-navy-soft">{partnershipLabels[r.type]}</p>
          <p className="mt-1 text-lg">{r.offer}</p>
          {(r.code || r.link) && (
            <p className="mt-1 text-sm text-navy-soft">
              {r.code && <>Code <strong className="text-navy">{r.code}</strong></>}
              {r.code && r.link && " · "}
              {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" className="break-all text-royal underline">{r.link}</a>}
            </p>
          )}
        </div>
      )}

      {r.stage === "proposed" && r.proposed_by_me && <p className="mt-4 font-semibold text-navy-soft">Waiting for {r.other_name} to agree.</p>}
      {r.stage === "proposed" && !r.proposed_by_me && (
        <form action={acceptPartnershipAction} className="mt-4 flex flex-wrap gap-3">
          {hidden}
          <SubmitButton pendingLabel="Saving…">Agree and go live</SubmitButton>
        </form>
      )}
      {r.stage === "live" && (
        <div className="mt-5 space-y-3">
          {r.my_code && (
            <div>
              <p className="font-semibold">Your link to share with your customers</p>
              <p className="mt-1 break-all rounded-lg bg-ice px-3 py-2 font-mono text-sm">{site.url}/r/{r.my_code}</p>
            </div>
          )}
          <p className="text-sm text-navy-soft">
            Visits from your link: <strong className="text-navy tabular-nums">{r.my_clicks}</strong> · from theirs:{" "}
            <strong className="text-navy tabular-nums">{r.their_clicks}</strong>
          </p>
          <p className="text-sm text-navy-soft">{consentCopy.disclosed}</p>
          <form action={endPartnershipAction}>
            {hidden}
            <button type="submit" className="text-sm font-semibold text-navy-soft underline hover:text-royal">End partnership</button>
          </form>
        </div>
      )}
      {(!r.stage || (r.stage === "proposed" && r.proposed_by_me)) && <ProposeForm hidden={hidden} again={Boolean(r.stage)} />}
    </li>
  );
}

function ProposeForm({ hidden, again }: { hidden: React.ReactNode; again: boolean }) {
  const types = Object.entries(partnershipLabels) as [PartnershipType, string][];
  const body = (
    <form action={proposeAction} className="mt-5 space-y-4">
      {hidden}
      <fieldset>
        <legend className="font-medium">What would you like to do?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {types.map(([value, label], i) => (
            <label key={value} className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 ring-1 ring-line has-[:checked]:bg-ice has-[:checked]:ring-royal">
              <input type="radio" name="type" value={value} defaultChecked={i === 0} className="accent-royal" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="The offer" name="offer" required maxLength={300} placeholder="10% off engagement sessions for couples you send us" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" name="code" optional maxLength={40} placeholder="BLOOM10" />
        <Field label="Link" name="link" optional type="url" maxLength={500} placeholder="https://" />
      </div>
      <SubmitButton pendingLabel="Sending…">{again ? "Send a new proposal" : "Propose"}</SubmitButton>
    </form>
  );
  return again ? (
    <details className="mt-4">
      <summary className="cursor-pointer text-sm font-semibold text-royal">Change your proposal</summary>
      {body}
    </details>
  ) : body;
}
