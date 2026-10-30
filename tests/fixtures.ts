import type { FormInput } from "@/lib/validation";

export const validApplication = (): FormInput => ({
  business_name: "Wasatch Office Movers",
  website: "wasatchmovers.example",
  category: "Commercial movers",
  category_other: "",
  years_in_business: "3–5 years",
  team_size: "6–15",
  service_areas: ["Sandy", "Murray"],
  ideal_customer: "Small offices relocating within the valley.",
  customer_needs: "Fast, careful moves with minimal downtime.",
  needs_before: "A new lease and a space plan.",
  needs_after: "Furniture installation and IT setup.",
  channels: ["email", "introductions"],
  channel_other: "",
  audience_email: "100–500",
  audience_introductions: "Under 100",
  current_referrals: "",
  desired_partner_types: "Office furniture installers",
  collaboration_interests: ["joint_offer"],
  collaboration_other: "",
  past_experience: "",
  time_per_month: "1–2 hours",
  commit_30_days: "yes",
  pilot_fit: "yes",
  contact_name: "Pat Example",
  contact_role: "Owner",
  email: "Pat@Example.com ",
  phone: "",
  preferred_contact: "email",
  consent_contact: "on",
});

export const validReferral = (): FormInput => ({
  name: "Riley Broker",
  organization: "Valley Commercial Realty",
  role: "Agent",
  email: "riley@example.com",
  phone: "(801) 555-0100",
  business_types: "New commercial tenants",
  connection: "I represent them on leases.",
  notes: "",
  consent_contact: "on",
});

export const validContact = (): FormInput => ({
  name: "Sam",
  email: "sam@example.com",
  topic: "claim",
  message: "When does the pilot start?",
  consent_contact: "on",
});

export const attribution = {
  source_page: "/join",
  referrer: "https://google.com/",
  utm_source: "newsletter",
  utm_medium: "email",
  utm_campaign: "pilot",
  utm_term: "",
  utm_content: "",
};
