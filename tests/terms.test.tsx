import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BuyerTermsPage from "@/app/terms/buyer/page";
import { PENDING_BUYER_TERMS_DECISIONS } from "@/app/terms/buyer/decisions";
import PartnerTermsPage from "@/app/terms/partner/page";
import { PENDING_PARTNER_TERMS_DECISIONS } from "@/app/terms/partner/decisions";
import { attributionWindowDays } from "@/lib/attribution";

const pages = [
  { name: "buyer", render: () => renderToStaticMarkup(<BuyerTermsPage />), pending: PENDING_BUYER_TERMS_DECISIONS },
  { name: "partner", render: () => renderToStaticMarkup(<PartnerTermsPage />), pending: PENDING_PARTNER_TERMS_DECISIONS },
];

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, " ");

describe.each(pages)("$name terms page", ({ render, pending }) => {
  const html = render();

  it("has no placeholder text", () => {
    expect(html).not.toMatch(/\[placeholder\]/i);
    expect(html).not.toMatch(/draft placeholder/i);
  });

  it("keeps the draft banner exactly while owner decisions are open", () => {
    expect(html.includes("not yet in effect as final terms")).toBe(pending.length > 0);
  });

  it("shows every open decision exactly once, and nothing that is not open", () => {
    const shown = [...html.matchAll(/data-owner-decision="([^"]+)"/g)].map((m) => m[1]);
    expect(shown.sort()).toEqual(pending.map((d) => d.id).sort());
  });

  it("does not invent a contact email address or phone number", () => {
    const body = text(html);
    expect(body).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    expect(body).not.toMatch(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
  });
});

describe("buyer terms content", () => {
  const body = text(renderToStaticMarkup(<BuyerTermsPage />));

  it("describes the outcome-verification timeline", () => {
    expect(body).toContain("About 2 hours after the scheduled time");
    expect(body).toContain("after 24 hours, we send a reminder");
    expect(body).toContain("still not reported after 48 hours, the appointment goes to review");
  });

  it("says nonresponse never uses a credit or creates a commission", () => {
    expect(body).toContain("Not responding never uses your credit on its own.");
    expect(body).toContain("No referral commission is created for an appointment just because you did not respond");
  });

  it("covers credit holds, payment by Stripe, exclusivity, and no guaranteed results", () => {
    expect(body).toContain("one credit moves from available to held");
    expect(body).toContain("Payments are processed by Stripe");
    expect(body).toContain("Each walkthrough is offered to one cleaning company only");
    expect(body).toContain("We do not guarantee that a business will hire you");
  });
});

describe("partner terms content", () => {
  const body = text(renderToStaticMarkup(<PartnerTermsPage />));

  it("states the same attribution window the code uses", () => {
    expect(attributionWindowDays()).toBe(90);
    expect(body).toContain("in that browser for 90 days");
  });

  it("lists every commission requirement and what does not earn one", () => {
    for (const phrase of [
      "attributed to you",
      "gave permission to be contacted",
      "actually completed the walkthrough",
      "dispute window for that walkthrough has closed",
      "credit for that walkthrough has been used",
      "does not earn a commission by itself",
      "if a cleaning company does not respond, no commission is created",
    ]) {
      expect(body).toContain(phrase);
    }
  });

  it("covers consent, prohibited outreach, and self-referrals", () => {
    expect(body).toContain("Only refer a business after someone authorized to speak for it has agreed");
    expect(body).toContain("purchased, rented, or scraped contact lists");
    expect(body).toContain("You may not refer your own business");
  });
});
