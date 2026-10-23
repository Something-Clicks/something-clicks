import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFound from "@/app/not-found";
import HomePage from "@/app/page";
import { BookingForm, BookingResult } from "@/app/book/booking-form";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { BUSINESS_CONSENT_TEXT } from "@/lib/constants";
import { bookingRequestSchema } from "@/lib/validation";

const text = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const links = (html: string) =>
  [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)].map((m) => ({ href: m[1], label: text(m[2]).trim() }));

describe("homepage", () => {
  const html = renderToStaticMarkup(<HomePage />);
  const body = text(html);

  it("leads with the brand line and says what the business does", () => {
    expect(html).toContain("Make the right connection click.");
    expect(body).toContain("connects Salt Lake Valley businesses that need commercial cleaning with local cleaning companies");
  });

  it("offers one path per audience, each with one action", () => {
    expect(body).toContain("Need commercial cleaning?");
    expect(body).toContain("Run a cleaning company?");
    expect(links(html)).toContainEqual({ href: "/book", label: "Request a walkthrough" });
    expect(links(html)).toContainEqual({ href: "/cleaning-companies", label: "See the pilot" });
    // Only the business path uses the filled primary style.
    expect(html.match(/class="btn /g)).toHaveLength(1);
  });

  it("keeps the partner program secondary and clearly not open", () => {
    const partnerLinks = links(html).filter((l) => l.href === "/partners");
    expect(partnerLinks).toEqual([{ href: "/partners", label: "Apply to be a partner" }]);
    expect(body).toContain("The program isn't open for referrals yet.");
    expect(body).not.toMatch(/earn|reward|payout/i);
  });

  it("makes no unsupported claims", () => {
    expect(body).not.toMatch(/vetted|instant|guarantee|within (one|two|\d+)/i);
  });
});

describe("header and footer", () => {
  const header = renderToStaticMarkup(<SiteHeader />);
  const footer = renderToStaticMarkup(<SiteFooter />);

  it("uses audience navigation with one prominent action", () => {
    const labels = links(header).map((l) => `${l.label} -> ${l.href}`);
    expect(labels).toEqual(
      expect.arrayContaining([
        "For businesses -> /#businesses",
        "For cleaning companies -> /cleaning-companies",
        "Sign in -> /login",
        "Request a walkthrough -> /book",
      ]),
    );
  });

  it("moves partners out of the header and into the footer", () => {
    expect(links(header).some((l) => l.href === "/partners")).toBe(false);
    expect(links(footer)).toContainEqual({ href: "/partners", label: "Referral partners" });
  });

  it("has an accessible, initially closed mobile menu button", () => {
    expect(header).toMatch(/<button[^>]*aria-expanded="false"[^>]*aria-label="Open menu"/);
  });
});

describe("/book form", () => {
  const html = renderToStaticMarkup(<BookingForm urlCode="jane-smith" />);

  it("submits exactly the same fields as before", () => {
    const names = new Set([...html.matchAll(/name="([a-z_0-9]+)"/g)].map((m) => m[1]));
    const expected = new Set([...Object.keys(bookingRequestSchema.shape), "url_code", "company_website"]);
    expect(names).toEqual(expected);
    expect(html).toContain('name="url_code" value="jane-smith"');
  });

  it("groups fields into three labelled sections", () => {
    const legends = [...html.matchAll(/<legend[^>]*>(.*?)<\/legend>/g)].map((m) => text(m[1]).trim());
    expect(legends).toEqual(["1. Your business", "2. Your space", "3. How to reach you"]);
  });

  it("keeps the consent checkbox and its exact wording, and the new button label", () => {
    expect(html).toMatch(/<input type="checkbox" required=""[^>]*name="consent"/);
    expect(text(html)).toContain(text(BUSINESS_CONSENT_TEXT).trim());
    expect(text(html)).toContain("Send request");
  });
});

describe("/book result states", () => {
  const actions = readFileSync(path.resolve(__dirname, "../src/app/book/actions.ts"), "utf8");

  it("shows 'Request received' with the server's message", () => {
    const html = renderToStaticMarkup(<BookingResult message="We'll review your request and contact you with next steps." />);
    expect(text(html)).toContain("Request received");
    expect(text(html)).toContain("We'll review your request and contact you with next steps.");
  });

  it("uses clear success and duplicate messages without promising a time or an email", () => {
    expect(actions).toContain(`const FOLLOW_UP = "We'll review your request and contact you with next steps.";`);
    expect(actions).toContain("We already have a walkthrough request for this business, so there's no need to send another.");
    const form = readFileSync(path.resolve(__dirname, "../src/app/book/booking-form.tsx"), "utf8");
    expect(form).not.toMatch(/emailed|sent you|check your (email|inbox)/i);
  });
});

describe("404 page", () => {
  it("helps visitors recover", () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(text(html)).toContain("Page not found");
    expect(links(html).map((l) => l.href)).toEqual(expect.arrayContaining(["/", "/book", "/cleaning-companies"]));
  });
});
