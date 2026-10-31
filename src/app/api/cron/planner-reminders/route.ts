import { dbConfigured } from "@/lib/db";
import { sendReminders } from "@/lib/planner/partners";

/**
 * Daily (vercel.json): the 30-day reminder before a Planner Partner's
 * membership ends, and the 30-day notice before a new agreement version.
 * Vercel Cron sends Authorization: Bearer $CRON_SECRET; anything else gets 401.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  if (!dbConfigured()) return Response.json({ skipped: "database not configured" });
  try {
    return Response.json(await sendReminders());
  } catch (error) {
    console.error("[cron] planner reminders failed", error);
    return new Response("Failed", { status: 500 });
  }
}
