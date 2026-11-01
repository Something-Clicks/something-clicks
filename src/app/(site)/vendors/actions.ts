"use server";

import { headers } from "next/headers";
import { submitInquiry } from "@/lib/couples/inquiries";
import { clientIp, hashIp } from "@/lib/request";

export type InquiryState =
  | { status: "idle" }
  | { status: "sent"; vendorName: string }
  | { status: "error"; message?: string; errors?: Record<string, string>; values?: Record<string, string> };

export async function sendInquiryAction(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const input: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") input[k] = v;
  const visitorKey = await hashIp(clientIp(await headers()));
  const r = await submitInquiry(input, { visitorKey });
  if (r.status === "ok") return { status: "sent", vendorName: r.vendorName };
  if (r.status === "invalid") return { status: "error", errors: r.errors, values: input };
  if (r.status === "limited") return { status: "error", message: "Too many inquiries from here. Please try again later.", values: input };
  return { status: "error", message: "This vendor isn't taking inquiries here right now." };
}
