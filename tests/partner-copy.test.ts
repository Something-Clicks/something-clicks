import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The partner program is not open yet: public pages and emails must not promise partner features that
// don't exist. Source files are scanned so email text is covered too.
const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");

const files = {
  homepage: "src/app/page.tsx",
  partnersPage: "src/app/partners/page.tsx",
  applicationEmail: "src/app/partners/actions.ts",
  partnerTerms: "src/app/terms/partner/page.tsx",
};

const unavailablePromises = [
  /QR code/i,
  /partner portal/i,
  /receive a personal referral link/i,
  /get (?:your|a) personal referral link/i,
  /track referrals/i,
  /submit a business (?:directly|yourself)/i,
  /when you submit a business/i,
  /earn a (?:referral )?fee/i,
  /on our site you can see/i,
];

describe.each(Object.entries(files))("%s", (_name, file) => {
  const source = read(file);
  it.each(unavailablePromises.map((p) => [p.source, p] as const))("does not promise /%s/", (_label, pattern) => {
    expect(source).not.toMatch(pattern);
  });
});

describe("partner copy", () => {
  it("says the program is not open yet and details come before referrals begin", () => {
    expect(read(files.homepage)).toContain("before referrals begin");
    expect(read(files.partnersPage)).toContain("The program is not open yet");
    expect(read(files.applicationEmail)).toContain("The partner program is not open yet.");
  });

  it("does not read the commission setting on the public partner page", () => {
    const page = read(files.partnersPage);
    expect(page).not.toMatch(/commission_amount_cents|supabaseAdmin|formatCents/);
  });

  it("keeps the partner application form", () => {
    expect(read(files.partnersPage)).toContain("<PartnerApplicationForm />");
  });
});
