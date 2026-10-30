import { z } from "zod";
import { clientIp, hashIp } from "@/lib/request";
import { getStore } from "@/lib/store";

const eventSchema = z.object({
  form: z.enum(["application", "referral", "contact"]),
  // form_submit is recorded server-side when a submission is saved.
  event: z.enum(["form_start", "form_step"]),
  step: z.number().int().min(1).max(10).nullish(),
  source_page: z.string().max(300).default(""),
  utm_source: z.string().max(200).default(""),
  utm_medium: z.string().max(200).default(""),
  utm_campaign: z.string().max(200).default(""),
});

/** First-party, cookieless form analytics. No personal data is accepted. */
export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > 2000) return new Response(null, { status: 413 });

  let parsed;
  try {
    parsed = eventSchema.safeParse(JSON.parse(body));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!parsed.success) return new Response(null, { status: 400 });

  try {
    const store = getStore();
    const ipHash = await hashIp(clientIp(request.headers));
    if (await store.checkRateLimit(`events:${ipHash}`, 3600, 60)) await store.recordEvent(parsed.data);
  } catch (error) {
    console.error("[events] failed to record", error);
  }
  return new Response(null, { status: 204 });
}
