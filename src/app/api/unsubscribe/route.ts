import { NextResponse, type NextRequest } from "next/server";
import { adminConfig } from "@/lib/admin-auth";
import { readUnsubscribeToken, unsubscribe } from "@/lib/invitations";

/** One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe header. */
export async function POST(request: NextRequest) {
  const email = await readUnsubscribeToken(request.nextUrl.searchParams.get("t") ?? "", adminConfig().secret);
  if (!email) return new NextResponse("Invalid link", { status: 400 });
  await unsubscribe(email);
  return new NextResponse("Unsubscribed", { status: 200 });
}

/** Someone opened the header URL in a browser: show the normal page. */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL(`/unsubscribe?${request.nextUrl.searchParams}`, request.url));
}
