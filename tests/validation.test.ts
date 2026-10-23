import { describe, expect, it } from "vitest";
import {
  addressKey,
  bookingRequestSchema,
  buyerOnboardingSchema,
  formToObject,
  partnerApplicationSchema,
  settingsSchema,
} from "@/lib/validation";

const application = {
  full_name: "Jane Smith",
  business_name: "Smith Commercial Realty",
  email: " Jane@Example.com ",
  phone: "(801) 555-0100",
  partner_type: "commercial_realtor",
  referral_plan: "Tenants moving into spaces I lease.",
  agree_terms: "on",
};

const booking = {
  business_name: "Acme Dental",
  contact_name: "Pat Lee",
  email: "pat@acmedental.com",
  phone: "801-555-0199",
  address_line1: "123 S Main Street",
  city: "Salt Lake City",
  zip: "84101",
  property_type: "medical",
  approx_sq_ft: "4500",
  cleaning_frequency: "weekly",
  is_decision_maker: "yes",
  current_contract_end: "",
  consent: "on",
};

describe("partner application", () => {
  it("normalizes a valid application", () => {
    const r = partnerApplicationSchema.parse(application);
    expect(r.email).toBe("jane@example.com");
    expect(r.phone).toBe("8015550100");
  });
  it("requires agreeing to the partner terms", () => {
    const r = partnerApplicationSchema.safeParse({ ...application, agree_terms: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["agree_terms"]);
  });
  it("rejects invalid emails, phones, and partner types", () => {
    expect(partnerApplicationSchema.safeParse({ ...application, email: "nope" }).success).toBe(false);
    expect(partnerApplicationSchema.safeParse({ ...application, phone: "123" }).success).toBe(false);
    expect(partnerApplicationSchema.safeParse({ ...application, partner_type: "spammer" }).success).toBe(false);
  });
});

describe("booking request", () => {
  it("accepts a complete request", () => {
    const r = bookingRequestSchema.parse(booking);
    expect(r.approx_sq_ft).toBe(4500);
    expect(r.current_contract_end).toBeNull();
  });
  it("cannot be submitted without consent", () => {
    const r = bookingRequestSchema.safeParse({ ...booking, consent: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toContain("consent");
    expect(bookingRequestSchema.safeParse({ ...booking, consent: "true" }).success).toBe(false);
  });
  it("validates ZIP and square footage", () => {
    expect(bookingRequestSchema.safeParse({ ...booking, zip: "8410" }).success).toBe(false);
    expect(bookingRequestSchema.safeParse({ ...booking, approx_sq_ft: "abc" }).success).toBe(false);
  });
});

describe("buyer onboarding", () => {
  const onboarding = {
    company_name: "Sparkle Commercial",
    contact_name: "Alex Kim",
    phone: "8015550123",
    website: "",
    service_areas: ["Sandy", "Draper"],
    min_sq_ft: "2000",
    property_types: ["office"],
    cleaning_frequencies: ["weekly"],
    availability_days: ["1", "3"],
    availability_start: "09:00",
    availability_end: "15:00",
  };
  it("accepts a valid profile", () => {
    expect(buyerOnboardingSchema.parse(onboarding).availability_days).toEqual([1, 3]);
  });
  it("requires a service area and a sensible time window", () => {
    expect(buyerOnboardingSchema.safeParse({ ...onboarding, service_areas: [] }).success).toBe(false);
    expect(buyerOnboardingSchema.safeParse({ ...onboarding, service_areas: ["Denver"] }).success).toBe(false);
    expect(buyerOnboardingSchema.safeParse({ ...onboarding, availability_end: "08:00" }).success).toBe(false);
  });
  it("accepts 0 (no minimum) and positive square footage", () => {
    expect(buyerOnboardingSchema.parse({ ...onboarding, min_sq_ft: "0" }).min_sq_ft).toBe(0);
    expect(buyerOnboardingSchema.parse({ ...onboarding, min_sq_ft: "2500" }).min_sq_ft).toBe(2500);
  });
  it("rejects an empty or whitespace-only minimum instead of treating it as 0", () => {
    for (const min_sq_ft of ["", "   ", undefined]) {
      const r = buyerOnboardingSchema.safeParse({ ...onboarding, min_sq_ft });
      expect(r.success).toBe(false);
      expect(r.error?.issues).toEqual([
        expect.objectContaining({ path: ["min_sq_ft"], message: "Enter a minimum square footage (0 for none)." }),
      ]);
    }
  });
  it("still rejects negative and fractional square footage", () => {
    expect(buyerOnboardingSchema.safeParse({ ...onboarding, min_sq_ft: "-5" }).success).toBe(false);
    expect(buyerOnboardingSchema.safeParse({ ...onboarding, min_sq_ft: "10.5" }).success).toBe(false);
  });
});

describe("settings", () => {
  it("keeps the commission amount unset when blank", () => {
    const r = settingsSchema.parse({
      price_per_appointment: "150",
      commission_amount: "",
      dispute_window_hours: "72",
      referral_expiry_days: "14",
    });
    expect(r.commission_amount).toBeNull();
    expect(r.price_per_appointment).toBe(150);
  });
  it("rejects zero or negative money amounts", () => {
    const base = { price_per_appointment: "", dispute_window_hours: "72", referral_expiry_days: "14" };
    expect(settingsSchema.safeParse({ ...base, commission_amount: "0" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...base, commission_amount: "-5" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("formToObject keeps multi-value fields as arrays", () => {
    const form = new FormData();
    form.append("name", "x");
    form.append("areas", "Sandy");
    form.append("areas", "Draper");
    expect(formToObject(form, ["areas", "missing"])).toEqual({ name: "x", areas: ["Sandy", "Draper"], missing: [] });
  });
  it("addressKey matches the same address written differently", () => {
    expect(addressKey("123 South Main Street, Suite 4", "84101")).toBe(addressKey("123 S. Main St #4", "84101"));
    expect(addressKey("123 S Main St", "84101")).not.toBe(addressKey("123 S Main St", "84102"));
  });
});
