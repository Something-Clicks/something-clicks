# Build status

Last updated: 2026-10-22.

## Live in the code now

**Public site**
- Homepage, "For cleaning companies", "Become a referral partner" (with application form),
  business booking page (`/book`), placeholder Buyer Terms / Partner Terms / Privacy.
- Partner application: validation, honeypot spam check, one live application per email
  (enforced in the database), confirmation email to the applicant, alert to admin.
- Booking page: accepts a partner code as `?via=` or `?ref=` (configurable), remembers it in a first-party
  HttpOnly cookie for 90 days (first valid code wins), records the business's details, qualification answers,
  and consent (timestamp, IP, consent text version). Repeat requests for the same business (same email or
  same normalized address) are recorded as duplicates and keep the original request's attribution.
  Requests are saved as **waiting for match**; the business is told we'll follow up within one business day,
  and admin is emailed.

**Buyers (Phase 1)**
- Sign up / sign in (Supabase Auth, email confirmation), company onboarding: service areas,
  criteria (min sq ft, property types, frequencies, notes), weekly availability, buyer terms agreement.
- Admin approves / rejects / suspends buyers (audit-logged; approval email sent).
- Admin-managed credit packs; Stripe Checkout (test mode only) for approved buyers.
- Stripe webhook: signature checked on the raw body, idempotent on event id, credits only on confirmed
  payment, handles async (bank) success/failure, expiry, refunds; amount mismatches go to review.
- Append-only credit ledger with database-enforced rules (one reserve and one release-or-consume per
  appointment). Balance computed from the ledger.
- Buyer dashboard: balance, held credits, completed walkthroughs, purchases, buy packs.

**Admin**
- Overview, buyers (with ledger, purchases, manual credit adjustments with reason), credit packs,
  partner applications (review / reject), booking requests, settings (price per appointment, commission
  amount — unset by default, dispute window, referral expiry). Admin actions are written to the audit log.

## Not built yet

- **Partner approval → PromoteKit affiliate creation** (Phase 2). Blocked on PromoteKit API access being
  verified (see `phase-0-report.md`). Approve is disabled in admin until then; applications stay pending.
- Partner page for logged-in partners, partner-submitted referrals (Phase 2–3).
- Automatic matching, time-slot booking, credit reservation, .ics invites, reminders, outcome verification,
  disputes, commissions (Phases 3–4). Until then, booking requests are matched manually by admin.
- Scheduled jobs (Phase 3+). Recommendation: pg_cron + pg_net calling a protected route.
- Weekly metrics (Phase 5).

## Tests

- `npm test`: unit tests for attribution/cookie window, form validation (incl. consent required),
  Stripe signature verification, duplicate webhooks, async payment outcomes, refunds, amount mismatch,
  retry after failure.
- `npm run test:db`: runs the real migrations on Postgres and tests the money functions, ledger rules,
  append-only enforcement, Stripe event idempotency, duplicate applications, consent constraint, and RLS.
