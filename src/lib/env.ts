import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** Server-side configuration. Values are read lazily so the site builds without secrets. */
export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: () => {
    const key = required("STRIPE_SECRET_KEY");
    if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_") && process.env.ALLOW_STRIPE_LIVE_MODE !== "true") {
      throw new Error("STRIPE_SECRET_KEY must be a test-mode key (set ALLOW_STRIPE_LIVE_MODE=true only at launch)");
    }
    return key;
  },
  stripeWebhookSecret: () => required("STRIPE_WEBHOOK_SECRET"),
  resendApiKey: () => process.env.RESEND_API_KEY || null,
  emailFrom: () => process.env.EMAIL_FROM || "Something Clicks <noreply@example.com>",
  adminNotificationEmail: () => process.env.ADMIN_NOTIFICATION_EMAIL || null,
};

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
