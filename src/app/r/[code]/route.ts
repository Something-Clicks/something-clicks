import { NextResponse, type NextRequest } from "next/server";
import { dbConfigured } from "@/lib/db";
import { followTrackingLink } from "@/lib/members/network";

/** Partner tracking link: counts the visit, then sends it on to the partner business. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const destination = dbConfigured() ? await followTrackingLink(code) : null;
  const res = NextResponse.redirect(destination ?? new URL("/", request.url), 302);
  res.headers.set("X-Robots-Tag", "noindex");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
