import { activeJourneys } from "@/content/journeys";

const suggestions = Array.from(
  new Set(activeJourneys().flatMap((j) => j.categories.flatMap((c) => [c.label, ...c.synonyms.slice(0, 3)]))),
).sort();

/** The central action. A plain GET form, so results have a shareable URL and work without JavaScript. */
export function FindForm({
  what = "",
  where = "",
  tone = "dark",
  id = "find",
}: {
  what?: string;
  where?: string;
  tone?: "dark" | "light";
  id?: string;
}) {
  return (
    <form
      id={id}
      action="/matches"
      method="get"
      role="search"
      aria-label="Find your business matches"
      className="scroll-mt-24 rounded-2xl bg-white/5 p-2 ring-1 ring-white/15 data-[tone=light]:bg-white data-[tone=light]:ring-line"
      data-tone={tone}
    >
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <div className="rounded-xl bg-white px-4 py-3">
          <label htmlFor={`${id}-what`} className="block text-xs font-semibold text-navy-soft">
            What does your business do?
          </label>
          <input
            id={`${id}-what`}
            name="what"
            required
            defaultValue={what}
            list={`${id}-what-list`}
            autoComplete="off"
            maxLength={80}
            placeholder="Wedding photographer"
            className="mt-0.5 block w-full border-0 bg-transparent p-0 text-lg text-navy placeholder:text-navy-soft/60 focus:ring-0 focus-visible:outline-none"
          />
          <datalist id={`${id}-what-list`}>
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div className="rounded-xl bg-white px-4 py-3">
          <label htmlFor={`${id}-where`} className="block text-xs font-semibold text-navy-soft">
            Where do you serve customers?
          </label>
          <input
            id={`${id}-where`}
            name="where"
            required
            defaultValue={where}
            autoComplete="address-level2"
            maxLength={80}
            placeholder="City, state or ZIP"
            className="mt-0.5 block w-full border-0 bg-transparent p-0 text-lg text-navy placeholder:text-navy-soft/60 focus:ring-0 focus-visible:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-royal px-6 py-4 text-base font-semibold text-white hover:bg-[#1f45e0]"
        >
          Find my matches
        </button>
      </div>
    </form>
  );
}
