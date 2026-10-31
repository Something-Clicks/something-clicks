import { faq } from "@/content/faq";

/** The FAQ as disclosure rows. Used on the homepage (h2) and /faq (where the page has its own h1). */
export function Faq({ heading = "Questions", headingLevel = 2 }: { heading?: string; headingLevel?: 1 | 2 }) {
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <section aria-labelledby="faq-heading">
      <H id="faq-heading" className={headingLevel === 1 ? "text-3xl font-bold sm:text-4xl" : "text-xl font-bold sm:text-2xl"}>
        {heading}
      </H>
      <div className="mt-4 divide-y divide-line rounded-3xl bg-white ring-1 ring-line">
        {faq.map((f) => (
          <details key={f.q} className="group px-5 sm:px-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
              <h3 className="text-base font-semibold">{f.q}</h3>
              <span aria-hidden="true" className="text-xl leading-none text-royal transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="pb-5 text-navy-soft">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
