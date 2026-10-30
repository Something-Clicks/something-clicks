import { pilot } from "@/content/pilot";
import { ButtonLink } from "./ui";

export function CtaBand({
  title = "Apply to the founding pilot",
  body = `The first cycle focuses on ${pilot.shortName}: ${pilot.summary.toLowerCase()} Founding members join free for a limited first cycle.`,
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="bg-royal text-white on-royal">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-14 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <h2 className="text-3xl">{title}</h2>
          <p className="mt-3 text-lg text-white">{body}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/join" variant="onDark">
            Apply to the founding pilot
          </ButtonLink>
          <ButtonLink href="/referral-partners" className="!bg-transparent ring-1 ring-inset ring-white hover:!bg-white/10">
            Refer businesses
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
