import Link from "next/link";
import { Check } from "lucide-react";
import { Notice } from "@/components/members/fields";
import { SubmitButton } from "@/components/members/SubmitButton";
import { getMember } from "@/lib/members/auth";
import { ownedPlaces } from "@/lib/members/network";
import { pageMeta } from "@/lib/metadata";
import { canApply, currentAgreement, partnerFor } from "@/lib/planner/partners";
import { readiness } from "@/lib/readiness";
import { applyAction } from "./actions";

export const metadata = pageMeta({
  title: "Planner Partners",
  path: "/planner-partners",
  description: "Planner Partners are wedding planners who help shape Something Clicks and bring trusted businesses into the network.",
});

const benefits = [
  "Complimentary membership for 12 months",
  "A Planner Partner label on your profile, seen by signed-in members",
  "Personal help bringing up to 10 businesses you trust onto Something Clicks",
  "Early access to new features",
  "A direct contact at Something Clicks",
];

type Search = { done?: string; error?: string };

export default async function PlannerPartnersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const ready = (await readiness()).members;
  const member = ready ? await getMember().catch(() => null) : null;
  const places = member ? await ownedPlaces(member.id) : [];
  const planner = places.find(canApply);
  const partner = planner ? await partnerFor(planner.id) : null;
  const agreement = currentAgreement();

  return (
    <div className="bg-cloud">
      <div className="container-page max-w-3xl py-12 sm:py-16">
        <h1 className="text-3xl font-bold sm:text-4xl">Planner Partners</h1>
        <p className="mt-4 text-lg text-navy-soft">
          Planner Partners are wedding planners who help shape Something Clicks and bring trusted businesses into the network.
        </p>

        <section className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-line" aria-labelledby="benefits-heading">
          <h2 id="benefits-heading" className="text-xl font-bold">What Planner Partners get</h2>
          <ul className="mt-4 space-y-2.5">
            {benefits.map((b) => (
              <li key={b} className="flex gap-2.5"><Check aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-royal" />{b}</li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-navy-soft">
            Being a Planner Partner never changes how anyone is matched or ranked. Read the{" "}
            <Link href="/planner-partners/agreement" className="font-semibold text-navy underline underline-offset-2">Planner Partner Agreement</Link>.
          </p>
        </section>

        <section id="apply" className="mt-8 scroll-mt-20 rounded-3xl bg-white p-6 ring-1 ring-line" aria-labelledby="apply-heading">
          <h2 id="apply-heading" className="text-xl font-bold">Apply</h2>
          {sp.error && <div className="mt-4"><Notice>{sp.error}</Notice></div>}
          {sp.done === "applied" && (
            <div className="mt-4"><Notice tone="success">Thanks! Your application is in, and we&rsquo;ve emailed you a copy of the agreement.</Notice></div>
          )}
          {!member ? (
            <p className="mt-3 text-navy-soft">
              Planner Partners are wedding planners who have claimed their business.{" "}
              <Link href="/sign-in?next=/planner-partners" className="font-semibold text-navy underline underline-offset-2">Sign in</Link> or{" "}
              <Link href="/claim" className="font-semibold text-navy underline underline-offset-2">Claim your business</Link> to apply.
            </p>
          ) : !planner ? (
            <p className="mt-3 text-navy-soft">Applications are open to verified wedding planners on Something Clicks.</p>
          ) : partner?.active ? (
            <p className="mt-3 text-navy-soft">{planner.name} is a Planner Partner until {partner.ends_on}. <Link href={`/dashboard/vendors?place=${planner.id}`} className="font-semibold text-navy underline underline-offset-2">Invite your vendors</Link>.</p>
          ) : sp.done === "applied" ? null : (
            <form action={applyAction} className="mt-4 space-y-4">
              <input type="hidden" name="place_id" value={planner.id} />
              <p className="text-navy-soft">Applying as <strong className="text-navy">{planner.name}</strong>.</p>
              <div>
                <label htmlFor="f-message" className="block font-medium">Anything you&rsquo;d like us to know <span className="text-sm font-normal text-navy-soft">(optional)</span></label>
                <textarea id="f-message" name="message" rows={3} maxLength={1000} className="mt-1.5 block w-full rounded-lg border border-field px-3.5 py-2.5" />
              </div>
              <label className="flex items-start gap-3">
                <input type="checkbox" name="agree" required className="mt-1 h-5 w-5 shrink-0" />
                <span>
                  I have read and agree to the{" "}
                  <Link href={`/planner-partners/agreement/v${agreement.version}`} target="_blank" className="font-semibold text-navy underline underline-offset-2">
                    Planner Partner Agreement
                  </Link>{" "}
                  (version {agreement.version}).
                </span>
              </label>
              <SubmitButton pendingLabel="Sending…">Apply to be a Planner Partner</SubmitButton>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
