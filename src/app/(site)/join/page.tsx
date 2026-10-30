import { ApplicationForm } from "@/components/forms/ApplicationForm";
import { P } from "@/components/Placeholder";
import { pilot } from "@/content/pilot";
import { consentCopy } from "@/content/site";
import { pageMeta } from "@/lib/metadata";

export const metadata = pageMeta({
  title: "Join the Network",
  path: "/join",
  description:
    "Apply to the Something Clicks Network founding pilot. Free for a limited first cycle for independent Salt Lake Valley businesses.",
});

export default function JoinPage() {
  return (
    <>
      <section className="bg-navy text-white on-dark">
        <div className="container-page py-14 sm:py-16">
          <h1 className="max-w-3xl text-4xl sm:text-5xl">Apply to the founding pilot</h1>
          <p className="mt-4 max-w-2xl text-lg text-mist">
            The first cycle focuses on {pilot.shortName}: {pilot.summary.toLowerCase()} Businesses outside this journey
            are welcome to apply for future cycles.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-mist">
            <li>About 10–15 minutes</li>
            <li>
              Free first cycle (<P value={pilot.cycleLength} />)
            </li>
            <li>No customer data requested</li>
          </ul>
        </div>
      </section>
      <section className="bg-cloud py-12 sm:py-16">
        <div className="container-page max-w-3xl">
          <ApplicationForm />
          <p className="mt-6 text-center text-sm text-navy-soft">{consentCopy.noGuarantee}</p>
        </div>
      </section>
    </>
  );
}
