import { describe, expect, it } from "vitest";
import {
  applicationSteps,
  contactSchema,
  formDataToInput,
  referralSchema,
  validate,
  validateApplication,
} from "@/lib/validation";
import { validApplication, validContact, validReferral } from "./fixtures";

describe("founding-member application", () => {
  it("accepts a complete application and normalizes values", () => {
    const r = validateApplication(validApplication());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.email).toBe("pat@example.com");
    expect(r.data.website).toBe("https://wasatchmovers.example/");
    expect(r.data.channels).toEqual([
      { channel: "email", audience: "100–500" },
      { channel: "introductions", audience: "Under 100" },
    ]);
    expect(r.data.consent_updates).toBe(false);
  });

  it("reports every missing required field with a readable message", () => {
    const r = validateApplication({ service_areas: [], channels: [], collaboration_interests: [] });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    for (const field of [
      "business_name",
      "website",
      "category",
      "service_areas",
      "ideal_customer",
      "channels",
      "desired_partner_types",
      "commit_30_days",
      "contact_name",
      "email",
      "preferred_contact",
      "consent_contact",
    ]) {
      expect(r.errors[field], field).toMatch(/^Please/);
    }
  });

  it("requires a description when category is Other", () => {
    const r = validateApplication({ ...validApplication(), category: "Other" });
    expect(!r.ok && r.errors.category_other).toBeTruthy();
    expect(validateApplication({ ...validApplication(), category: "Other", category_other: "Locksmith" }).ok).toBe(true);
  });

  it("requires an audience size for each selected channel", () => {
    const r = validateApplication({ ...validApplication(), audience_email: "" });
    expect(!r.ok && r.errors.audience_email).toBe("Please choose an approximate audience size.");
  });

  it("requires descriptions for 'other' channel and collaboration", () => {
    const r = validateApplication({
      ...validApplication(),
      channels: ["other"],
      audience_other: "Not sure",
      collaboration_interests: ["other"],
    });
    expect(!r.ok && r.errors.channel_other).toBeTruthy();
    expect(!r.ok && r.errors.collaboration_other).toBeTruthy();
  });

  it("rejects values outside the option lists", () => {
    const r = validateApplication({ ...validApplication(), service_areas: ["Atlantis"], commit_30_days: "definitely" });
    expect(!r.ok && r.errors.service_areas).toBeTruthy();
    expect(!r.ok && r.errors.commit_30_days).toBeTruthy();
  });

  it("rejects bad websites, emails, and phone numbers", () => {
    const r = validateApplication({ ...validApplication(), website: "not a site", email: "pat@", phone: "12" });
    expect(!r.ok && r.errors.website).toBeTruthy();
    expect(!r.ok && r.errors.email).toBeTruthy();
    expect(!r.ok && r.errors.phone).toBeTruthy();
  });

  it("accepts social profile links", () => {
    expect(validateApplication({ ...validApplication(), website: "instagram.com/wasatchmovers" }).ok).toBe(true);
  });

  it("caps long answers", () => {
    const r = validateApplication({ ...validApplication(), ideal_customer: "x".repeat(2001) });
    expect(!r.ok && r.errors.ideal_customer).toMatch(/under 2000/);
  });

  it("validates one step at a time for the multi-step form", () => {
    const step1 = applicationSteps[0].schema.safeParse(validApplication());
    expect(step1.success).toBe(true);
    const step5 = applicationSteps[4].schema.safeParse({ ...validApplication(), consent_contact: "" });
    expect(step5.success).toBe(false);
  });
});

describe("referral partner interest", () => {
  it("accepts a valid submission", () => {
    expect(validate(referralSchema, validReferral()).ok).toBe(true);
  });
  it("requires consent and contact details", () => {
    const r = validate(referralSchema, { ...validReferral(), consent_contact: undefined, organization: " " });
    expect(!r.ok && r.errors.consent_contact).toBeTruthy();
    expect(!r.ok && r.errors.organization).toBeTruthy();
  });
});

describe("contact", () => {
  it("accepts a valid message", () => {
    expect(validate(contactSchema, validContact()).ok).toBe(true);
  });
  it("rejects an unknown topic", () => {
    const r = validate(contactSchema, { ...validContact(), topic: "sales-pitch" });
    expect(!r.ok && r.errors.topic).toBeTruthy();
  });
});

describe("formDataToInput", () => {
  it("collects multi-value fields as arrays and skips framework fields", () => {
    const fd = new FormData();
    fd.append("service_areas", "Sandy");
    fd.append("service_areas", "Murray");
    fd.append("business_name", "Acme");
    fd.append("$ACTION_ID_abc", "");
    const input = formDataToInput(fd);
    expect(input.service_areas).toEqual(["Sandy", "Murray"]);
    expect(input.business_name).toBe("Acme");
    expect(input.channels).toEqual([]);
    expect(Object.keys(input).some((k) => k.startsWith("$ACTION"))).toBe(false);
  });
});
