import type { Metadata } from "next";
import { PageHeader } from "@/components/site-chrome";
import { requireBuyerUser } from "@/lib/auth";
import { loadBuyerProfile } from "@/lib/buyers";
import { OnboardingForm, type OnboardingDefaults } from "./onboarding-form";

export const metadata: Metadata = { title: "Company setup" };

export default async function OnboardingPage() {
  const user = await requireBuyerUser();
  const buyer = await loadBuyerProfile({ userId: user.id });
  const first = buyer?.availability[0];
  const defaults: OnboardingDefaults = buyer
    ? {
        company_name: buyer.company_name,
        contact_name: buyer.contact_name,
        phone: buyer.phone,
        website: buyer.website,
        service_areas: buyer.service_areas,
        min_sq_ft: buyer.criteria?.min_sq_ft,
        property_types: buyer.criteria?.property_types,
        cleaning_frequencies: buyer.criteria?.cleaning_frequencies,
        notes: buyer.criteria?.notes,
        availability_days: buyer.availability.map((a) => String(a.day_of_week)),
        availability_start: first?.start_time.slice(0, 5),
        availability_end: first?.end_time.slice(0, 5),
      }
    : {};

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title={buyer ? "Company settings" : "Set up your cleaning company"}
        intro="Tell us where you work and what you clean. We use this to decide which walkthrough requests to offer you, and we review every company before it can buy the pilot."
      />
      <div className="card">
        <OnboardingForm defaults={defaults} isNew={!buyer} />
      </div>
    </div>
  );
}
