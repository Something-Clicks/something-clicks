import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CleaningCompaniesPage from "@/app/cleaning-companies/page";
import SignUpPage from "@/app/signup/page";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const links = (html: string) =>
  [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)].map((m) => ({ href: m[1], label: text(m[2]).trim() }));
const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");

// Claims about features that don't exist yet (booking, tracking, automatic matching) or guarantees.
const unsupported = [
  /\bbooks\b/i,
  /booked/i,
  /you confirm it happened/i,
  /comes back to you/i,
  /referred by people they trust/i,
  /automatic(ally)? match/i,
  /instant/i,
  /guarantee/i,
  /within (one|two|\d+)/i,
  /appointment credits?/i,
];

describe("/cleaning-companies", () => {
  const html = renderToStaticMarkup(<CleaningCompaniesPage />);
  const body = text(html);

  it("states the pilot accurately", () => {
    expect(body).toContain("$750");
    expect(body).toContain("for 5 qualifying completed walkthroughs · $150 each");
    expect(body).toContain("You pay for walkthroughs that qualify and are completed, not for scheduled ones.");
    expect(body).toContain("A scheduled walkthrough on its own doesn't count.");
    // Never suggest that buying a credit or scheduling a walkthrough is itself a qualifying walkthrough.
    expect(body).not.toMatch(/each credit (covers|is) one (qualifying )?(completed )?walkthrough/i);
  });

  it("says cleaning companies are the paying customers and businesses use it free", () => {
    expect(body).toContain("Something Clicks is built for commercial cleaning companies. You pay for walkthroughs");
    expect(body).toContain("Businesses use the service for free.");
  });

  it("describes the real, partly manual process", () => {
    expect(body).toContain("We review your company");
    expect(body).toContain("Your credits appear on your dashboard once Stripe confirms the payment.");
    expect(body).toContain("the Something Clicks team handles this personally, not through your dashboard");
    expect(body).toContain("When a request fits your service area and criteria, we'll be in touch about it.");
    // No promise of an unbuilt workflow (every request routed to you, or a built-in outcome check).
    expect(body).not.toMatch(/each walkthrough, we ask|we get in touch to arrange|When a business in your area asks/i);
    expect(body).toContain("we can't promise that a business will hire you");
  });

  it("makes no unsupported claims", () => {
    for (const pattern of unsupported) expect(body).not.toMatch(pattern);
  });

  it("gives the pilot box its light-blue background without the white .card override", () => {
    expect(html).toMatch(/<section aria-labelledby="pilot" class="[^"]*\bbg-brand-50\b[^"]*"/);
    expect(html).not.toMatch(/<section aria-labelledby="pilot" class="[^"]*\bcard\b/);
  });

  it("has one action, creating an account, and links the draft buyer terms", () => {
    expect(links(html).filter((l) => l.href === "/signup").map((l) => l.label)).toEqual([
      "Create an account",
      "Create an account",
    ]);
    expect(links(html)).toContainEqual({ href: "/terms/buyer", label: "buyer terms" });
    expect(body).toContain("(draft)");
  });
});

describe("/signup", () => {
  it("is clearly for cleaning companies and explains the next step", () => {
    const body = text(renderToStaticMarkup(<SignUpPage />));
    expect(body).toContain("Create your company account");
    expect(body).toContain("we'll review it before you can buy the pilot");
  });
});

describe("onboarding and dashboard copy", () => {
  const dashboard = read("src/app/dashboard/page.tsx");
  const onboarding = read("src/app/onboarding/page.tsx") + read("src/app/onboarding/onboarding-form.tsx");

  it("no longer refers to booking or appointment features that don't exist", () => {
    for (const phrase of ["Held for booked appointments", "Booked walkthroughs will appear here", "not live yet", "appointment credits", "per appointment", "Buy with Stripe"]) {
      expect(dashboard).not.toContain(phrase);
    }
  });

  it("uses consistent credit and walkthrough wording", () => {
    expect(dashboard).toContain('<Stat label="Available credits"');
    expect(dashboard).toContain("per qualifying completed walkthrough");
    expect(dashboard).toContain("Continue to secure checkout");
    expect(dashboard).toContain("walkthroughs are arranged with you directly by the Something Clicks team");
    expect(dashboard).toContain("isn&apos;t available yet.");
    expect(dashboard).toContain("A scheduled walkthrough on its own doesn&apos;t");
    expect(dashboard).not.toContain("We&apos;ll contact you directly to arrange each walkthrough");
    expect(dashboard).toContain("We'll email you when it's approved, and then you can buy the pilot.");
  });

  it("onboarding explains why the details matter and submits for review", () => {
    expect(onboarding).toContain("We use this to decide which walkthrough requests to offer you");
    expect(onboarding).toContain('"Submit for review"');
    expect(onboarding).not.toMatch(/appointment credits/);
  });

  it("approval email points to the pilot", () => {
    const admin = read("src/app/admin/actions.ts");
    expect(admin).toContain("Your company is approved. Next step: buy the pilot from your dashboard");
    expect(admin).not.toMatch(/appointment credits/);
  });
});
