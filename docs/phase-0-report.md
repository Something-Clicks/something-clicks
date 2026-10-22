# Phase 0 report — PromoteKit verification and architecture

Status: **Blocked on access. Nothing has been verified against the live PromoteKit API or docs yet.**
No code has been written. Waiting for go-ahead.

## 1. What could not be done, and why

| Step | Result | What's needed |
|---|---|---|
| Read-only calls (list affiliates, campaigns, commissions, payouts) | **Not run.** No `PROMOTEKIT_API_KEY` exists in this environment. | Add `PROMOTEKIT_API_KEY` as an environment secret / variable in the cloud environment settings (not in chat). A new session picks it up. |
| Read `promotekit.com/llms.txt`, `llms-full.txt`, `.mdx` pages | **Blocked.** The environment's network policy denies `promotekit.com` and `www.promotekit.com`. | Add `promotekit.com` and `www.promotekit.com` to Allowed domains in the environment's Network access settings (keep "Allow package managers" ticked). Steps: https://code.claude.com/docs/en/cloud-environments#network-access |
| Synthetic-email test and portal check | Not run (needs live mode approval and the above). | Your explicit approval for `PROMOTEKIT_MODE=live` with one labeled test affiliate. |

Phase 1 will also need these hosts allowed for local dev/tests that touch real services:
`api.stripe.com`, `*.supabase.co`, `api.resend.com`, plus npm registry (covered by "package managers").

Nothing below is a verified fact about PromoteKit. Everything marked **UNVERIFIED** comes from your brief
and will be checked line by line once docs and the key are reachable.

## 2. What to check in the PromoteKit dashboard yourself (today)

1. **Settings → Billing / Plan**: does it say *Pro (trial)* with an end date, or *Free*? If *Free*, every API call returns 403 and webhooks won't fire. Start the Pro trial (or upgrade) before any PromoteKit work.
2. **Trial end date** — write it down. The integration will queue work locally if access lapses, but you'll want to upgrade before then.
3. **Settings → API**: whether you can create an API key at all (if the option is missing/locked, you're on Free).
4. **Payouts settings**: is Stripe Connect available and connected? Which funding method? Display currency USD?
5. **Team**: who is Owner/Admin (only they receive the payout confirmation code).
6. **Campaign**: does a default campaign exist, and is "require approval" on? (We approve in our app, then create affiliates with `approved: true`.)

## 3. Confirmed-by-design workflow (to verify against docs)

```
partner approved in our admin
  → POST /affiliates {email, first_name, last_name, ref_code=<our code>, approved:true, campaign_id}
business confirms + consents on our booking page
  → POST /referrals {affiliate_id, email=<synthetic address>}
walkthrough completed (buyer confirms or admin resolves)
  → credit consumed in our ledger
  → dispute window passes with no dispute
  → POST /commissions {referral_id, revenue_amount=<price buyer paid>, commission_amount=<configured fee>,
                       metadata="sc:<internal idempotency key>"}
owner pays partners manually in the PromoteKit dashboard
  → our app only reads GET /payouts for display
```

Open questions on this flow (**UNVERIFIED**, to check in docs):
- Are `revenue_amount` / `commission_amount` dollars or cents?
- Does `GET /affiliates` support filtering by email, or do we paginate to "check by email before creating"?
- Does `GET /referrals` / `GET /commissions` support filtering (by affiliate, by date) for reconciliation?
- Does a referral created via API with no Stripe customer still accept commissions? (The brief implies yes.)
- Does the Free-plan 3-referral limit also apply during the trial?
- Webhook signature: header name, algorithm (likely HMAC-SHA256), timestamp tolerance, and whether payloads carry a unique event id we can dedupe on.
- Exact affiliate-link query parameter (brief suggests `?via=`).

## 4. Privacy recommendation (pending live test)

Use a synthetic, non-deliverable address per referral: `ref-<referral_uuid>@refs.<your-domain>`.
- Configure `refs.<your-domain>` with a **null MX record** (RFC 7505: `MX 0 .`) so mail to it is rejected rather than delivered anywhere.
- Real business name/email/phone live only in Supabase, behind RLS.
- The partner sees business name + status on **our** partner page (which they consented to by referring); the PromoteKit portal sees only the synthetic address.
- Before committing: with your approval, create one test affiliate (`test-affiliate+phase0@<your-domain>`), one referral with a synthetic address, and look at the affiliate portal to confirm what it shows. No commission will be created in that test (commissions can't be deleted).

## 5. Link format

- On approval we generate our own referral code (e.g. `jane-smith-4k2`) and pass it as `ref_code`, so the PromoteKit portal link and our link share it.
- Our booking page accepts the code under a **configurable** param name (default `via`, also accept `ref`) so we're not broken if the docs say otherwise.
- Attribution is recorded in our DB (URL param → first-party httpOnly cookie, 90-day default window). PromoteKit's tracking script is not used.
- Open question: PromoteKit links normally point at a URL you configure in the campaign. Set that to our booking page (`https://<your-domain>/book`) so portal links land on us.

## 6. Architecture

**One Next.js (App Router, TS) app on Vercel + Supabase.**

- **Auth/roles**: Supabase Auth; `profiles.role` ∈ `buyer | partner | admin`. RLS on every table; buyers see only their own rows, partners see only their own referrals (name + status via a restricted view), admin via role check. Service-role key used only in server code (`server-only` imports).
- **Money**: append-only `credit_ledger`. `available = purchases + adjustments − refunds − consumes − active reserves`. A reservation is tied to one appointment with a unique partial index, so double-reserve / double-consume is impossible at the DB level.
- **Stripe**: Checkout for packs; webhook verifies signature on raw body, dedupes on `stripe_events.id`, credits only on `checkout.session.completed` with `payment_status=paid` or `checkout.session.async_payment_succeeded`; refunds via `charge.refunded` write negative ledger entries.
- **Job queue in Postgres**: a `jobs` table (`kind`, `idempotency_key` unique, `run_at`, `attempts`, `status`, `locked_until`). Workers claim with `FOR UPDATE SKIP LOCKED`, so one key is never in flight twice. All PromoteKit calls, emails, reminders, outcome checks, expiries run as jobs — never inline in a user request.
- **Scheduler: pg_cron + pg_net (recommended) over Vercel Cron.** Reason: Vercel Hobby cron runs at most once a day, which breaks "2 hours after the walkthrough" and day-of reminders; Pro allows per-minute but costs $20/mo. pg_cron is available on Supabase's free tier, runs every minute, and its schedule lives in a migration. It just POSTs to `/api/jobs/run` with a shared secret; all logic stays in TypeScript and is idempotent. (If you're already on Vercel Pro, Vercel Cron works equally well — tell me.)
- **PromoteKit layer** (`src/server/promotekit/`): single client; `PROMOTEKIT_MODE=mock|live` (mock default, no network); `promotekit_sync` table (unique internal key, status `pending | in_flight | succeeded | outcome_unknown | failed_retryable | needs_admin | paused`, external id); `promotekit_api_log` with PII/secret redaction. Timeouts → `outcome_unknown` → reconcile via list endpoints + webhooks → admin review if still unclear. 429/5xx/connection refused → backoff retry. 400/401/409 → admin queue. 403 → global "PromoteKit paused" flag, queue keeps filling, admin alerted, drains in order when access returns. No payout writes, ever.
- **Email**: Resend, sent from jobs, with `.ics` attachments for appointments.

### Data model changes vs. the brief
- Add `profiles` (role), `jobs`, `promotekit_sync`, `promotekit_api_log`, `credit_packs`, `terms_versions` (partner + buyer terms, so disputes reference the exact version), `appointment_outcome_tokens` (single-use signed links for buyer/business responses), `appointment_evidence` (business check answers, buyer reports), `referral_attributions` (click/cookie records).
- `commissions.status` gains `flagged_manual` (sent, then needs reversal in the dashboard).
- `referrals.status` gains `waiting_for_match` and `needs_admin_review` (first 3 referrals, conflicts).
- Appointment, commission, and payout status stay in separate columns/tables as requested.

## 7. Known limitations (from the brief, to re-verify)

- No idempotency keys → duplicates prevented only on our side; exactly-once is **not** guaranteed.
- No commission delete/void → commissions are sent only after the dispute window and credit consumption; later reversals are manual in the dashboard.
- Payouts are dashboard-only, with a 5% (bank) / 8% (card) fee, $20 minimum per affiliate, USD only.
- 200 req/min per key; our queue throttles well under that.
- Trial expiry → all endpoints 403, webhooks stop; core bookings and credits keep working.

## 8. Decisions I need from you

1. Allow `promotekit.com` / `www.promotekit.com` (and Stripe/Supabase/Resend hosts) and add `PROMOTEKIT_API_KEY` as an environment secret, then I'll re-run Phase 0 steps 1–3 in a new session.
2. Your production domain (for booking links and `refs.<domain>` synthetic emails).
3. Scheduler: pg_cron (recommended) or Vercel Cron (only if on Vercel Pro).
4. Whether I may start Phase 1 (buyers, credits, Stripe — no PromoteKit dependency) while PromoteKit access is sorted.
