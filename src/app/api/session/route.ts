import { getMember } from "@/lib/members/auth";

/** Whether a member is signed in, for the header. No personal details. */
export async function GET() {
  const member = await getMember().catch(() => null);
  return Response.json({ signedIn: Boolean(member) }, { headers: { "Cache-Control": "private, no-store" } });
}
