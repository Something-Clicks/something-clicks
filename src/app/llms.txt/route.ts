import { pricing, steps, summary } from "@/content/explainer";
import { faq } from "@/content/faq";
import { metros } from "@/content/metros";
import { site } from "@/content/site";

export const dynamic = "force-static";

/** /llms.txt: a plain-text summary of the site for AI assistants (llmstxt.org). */
export function GET() {
  const body = [
    `# ${site.name}`,
    "",
    `> ${summary}`,
    "",
    site.about,
    "",
    "## How it works",
    "",
    ...steps.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`),
    "",
    "## Pricing",
    "",
    ...pricing.map((p) => `- ${p.name} (${p.price}): ${p.body}`),
    "",
    "Public pages show live counts of wedding businesses by category and city, and which kinds of businesses fit each other and why. They never show business names: owners see names once they claim their business.",
    "",
    "## Pages",
    "",
    `- [Home](${site.url}/): search by what your business does and where`,
    `- [Questions](${site.url}/faq): what it is, cost, privacy and cities`,
    `- [Cities](${site.url}/weddings): live metros`,
    ...metros.map((m) => `- [${m.name}](${site.url}/weddings/${m.slug}): wedding businesses in ${m.name} by category`),
    `- [Data sources](${site.url}/data-sources): where the business data comes from`,
    `- [Remove my business](${site.url}/remove-my-business)`,
    "",
    "## Questions",
    "",
    ...faq.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
