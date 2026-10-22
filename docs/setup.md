# Setup

Everything here is done once per environment. Stripe stays in **test mode** until launch.

## 1. Supabase

1. Create a project at supabase.com.
2. Apply the migrations in `supabase/migrations/` in order. Either:
   - **SQL editor:** paste each file and run it, or
   - **CLI:** `supabase link --project-ref <ref>` then `supabase db push`.
3. **Authentication → URL configuration**
   - Site URL: your production URL (e.g. `https://somethingclicks.com`).
   - Redirect URLs: add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback`
     (plus your Vercel preview domain pattern if you want previews to support sign-up).
4. **Authentication → Providers → Email:** keep "Confirm email" on.
   Supabase's built-in email sender is rate-limited; for real use set up custom SMTP
   (Resend offers SMTP) under **Authentication → SMTP Settings**.
5. Copy the project URL, the anon/publishable key, and the service role/secret key into the env vars
   (see `.env.example`).

### Make yourself an admin

Sign up on the site once (any email; it will start as a buyer account), then run in the SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Admins go to `/admin`. There is intentionally no way to become admin from the website.

### Adding future migrations

Supabase grants table access to `anon` and `authenticated` by default. Every new migration must
`enable row level security` on new tables and revoke writes, as the first migration does.

## 2. Stripe (test mode)

1. In the Stripe dashboard, switch **Test mode** on.
2. **Developers → API keys:** copy the secret key (`sk_test_...`) into `STRIPE_SECRET_KEY`.
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://<your-domain>/api/webhooks/stripe`
   - Events:
     - `checkout.session.completed`
     - `checkout.session.async_payment_succeeded`
     - `checkout.session.async_payment_failed`
     - `checkout.session.expired`
     - `charge.refunded`
   - Copy the signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
4. **Settings → Payment methods:** enable what buyers may pay with (cards; optionally US bank account/ACH,
   which settles asynchronously — credits appear only when Stripe confirms the payment).
5. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` prints a local `whsec_`.
   Test card: `4242 4242 4242 4242`, any future date, any CVC.

How credits work:
- Buying a pack creates a `credit_purchases` row and a Stripe Checkout session.
- Credits are added **only** by the verified webhook when Stripe reports the payment as paid. The success
  page never adds credits.
- If Stripe's amount doesn't match the pack price, the purchase is marked "needs review", no credits are
  added, and admin is emailed.
- Refunds made in the Stripe dashboard remove credits in proportion to the amount refunded, rounded up
  (refund 30% of a 5-credit pack → 2 credits removed). A balance can go negative if credits were already used.

## 3. Resend

1. Add and verify your sending domain at resend.com.
2. Create an API key → `RESEND_API_KEY`. Set `EMAIL_FROM` to an address on that domain and
   `ADMIN_NOTIFICATION_EMAIL` to where alerts should go.
3. Without these, emails are skipped (logged as a warning) and everything else keeps working.

## 4. Vercel

1. Import the GitHub repo into Vercel (framework: Next.js; no build settings to change).
2. Add the env vars from `.env.example` under **Settings → Environment Variables** for Production
   (and Preview if you want previews to work). Set `NEXT_PUBLIC_SITE_URL` to the production URL.
3. Pushing to `main` deploys production.

## 5. Before taking real orders

- In `/admin/packs`, create at least one credit pack (e.g. "Pilot pack", 5 credits).
- In `/admin/settings`, set the price per appointment and the partner commission amount.
- Replace the placeholder Buyer Terms, Partner Terms, and Privacy pages
  (`src/app/terms/*`, `src/app/privacy`) and bump the version constants in `src/lib/constants.ts`.

## Running checks locally

```bash
npm install
npm run typecheck && npm run lint && npm test && npm run build
# Database tests (need a throwaway local Postgres 15+ superuser connection):
TEST_DATABASE_ADMIN_URL=postgresql://postgres@127.0.0.1:5432/postgres npm run test:db
```
