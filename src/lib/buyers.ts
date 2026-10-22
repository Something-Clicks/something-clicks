import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type Buyer = {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string | null;
  status: "pending" | "approved" | "rejected" | "suspended";
  stripe_customer_id: string | null;
  terms_version: string;
  terms_agreed_at: string;
  approved_at: string | null;
  created_at: string;
};

export type BuyerProfile = Buyer & {
  service_areas: string[];
  criteria: { min_sq_ft: number; property_types: string[]; cleaning_frequencies: string[]; notes: string | null } | null;
  availability: { day_of_week: number; start_time: string; end_time: string }[];
};

export type Balance = { available: number; reserved: number; purchased: number; consumed: number };

export type Purchase = {
  id: string;
  pack_name: string;
  credits: number;
  amount_cents: number;
  status: string;
  refunded_cents: number;
  credits_refunded: number;
  review_reason: string | null;
  paid_at: string | null;
  created_at: string;
};

export async function loadBuyerProfile(where: { userId: string } | { buyerId: string }): Promise<BuyerProfile | null> {
  const db = supabaseAdmin();
  const query = db.from("buyers").select("*, buyer_service_areas(area), buyer_criteria(*), buyer_availability(*)");
  const { data, error } = await ("userId" in where ? query.eq("user_id", where.userId) : query.eq("id", where.buyerId)).maybeSingle();
  if (error) throw new Error(`loading buyer failed: ${error.message}`);
  if (!data) return null;
  const { buyer_service_areas, buyer_criteria, buyer_availability, ...buyer } = data;
  return {
    ...(buyer as Buyer),
    service_areas: (buyer_service_areas ?? []).map((a: { area: string }) => a.area),
    criteria: Array.isArray(buyer_criteria) ? (buyer_criteria[0] ?? null) : (buyer_criteria ?? null),
    availability: (buyer_availability ?? []).sort(
      (a: { day_of_week: number }, b: { day_of_week: number }) => a.day_of_week - b.day_of_week,
    ),
  };
}

export async function loadBalance(buyerId: string): Promise<Balance> {
  const { data, error } = await supabaseAdmin()
    .from("buyer_credit_balances")
    .select("available, reserved, purchased, consumed")
    .eq("buyer_id", buyerId)
    .maybeSingle();
  if (error) throw new Error(`loading balance failed: ${error.message}`);
  return data ?? { available: 0, reserved: 0, purchased: 0, consumed: 0 };
}

export async function loadPurchases(buyerId: string): Promise<Purchase[]> {
  const { data, error } = await supabaseAdmin()
    .from("credit_purchases")
    .select("id, pack_name, credits, amount_cents, status, refunded_cents, credits_refunded, review_reason, paid_at, created_at")
    .eq("buyer_id", buyerId)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`loading purchases failed: ${error.message}`);
  return (data ?? []) as Purchase[];
}

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  pending: "Started",
  processing: "Payment processing",
  paid: "Paid",
  failed: "Payment failed",
  expired: "Checkout abandoned",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  needs_review: "Under review",
};
