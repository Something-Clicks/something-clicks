# Something Clicks

The website for the **Something Clicks Network**, a managed partnership network that helps independent Salt Lake Valley businesses gain customers through complementary local businesses. The full build specification is in [`docs/network-build-spec.md`](docs/network-build-spec.md).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth) · Resend · Vercel (hosting and Web Analytics) · Cloudflare (DNS only)

## What's here

| Area | Routes |
|---|---|
| Public pages | `/`, `/how-it-works`, `/for-businesses`, `/referral-partners`, `/join`, `/about`, `/contact`, `/privacy`, `/terms` |
| Confirmations | `/join/thanks`, `/referral-partners/thanks`, `/contact/thanks` |
| Admin (single administrator) | `/admin`, `/admin/applications`, `/admin/referrals`, `/admin/contacts`, detail pages, `/admin/export` |
| Internal | `/api/events` (first-party form analytics), `/sitemap.xml`, `/robots.txt` |

Content you are likely to edit:

- `src/content/site.ts`: contact email, response window, founder note, service-area cities, consent wording
- `src/content/pilot.ts`: the founding-pilot journey (currently small-business setup), its member and referral-partner types, cycle length, and application window
- `src/content/options.ts`: form dropdown and checkbox options
- `src/app/globals.css`: brand color tokens

Values wrapped in `placeholder(...)` render with a yellow **placeholder** marker until you replace them. The logo is a marked temporary placeholder in `src/components/LogoPlaceholder.tsx`. Replace that component, `public/icon.svg`, and `public/og-default.png` when the real logo arrives.

## Local development

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Without Supabase settings, development uses an **in-memory store**: forms work, and data disappears when the server restarts. To try the admin area without Supabase, set `ADMIN_DEV_LOGIN=true` in `.env.local` and use the **Dev sign-in** button on `/admin/login`. It only works under `npm run dev`.

Checks (run all of these before pushing):

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Environment variables

Set these in **Vercel → Project → Settings → Environment Variables**. Production and Preview are separate scopes.

| Variable | Production | Preview | Notes |
|---|---|---|---|
| `SITE_URL` | `https://somethingclicks.com` | leave unset | Previews use their own `VERCEL_URL` automatically |
| `SUPABASE_URL` | required | required | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | required | required | Server-only secret key. **Never** prefix with `NEXT_PUBLIC_` |
| `SUPABASE_ANON_KEY` | required | required | Public anon/publishable key; used only for the admin magic link |
| `ADMIN_EMAIL` | required | required | The one address allowed into `/admin` |
| `ADMIN_SESSION_SECRET` | required | required | 32+ random characters (`openssl rand -base64 48`); use a different value per scope |
| `RATE_LIMIT_SALT` | required | required | Any long random string |
| `RESEND_API_KEY` | required | optional | Without it, notifications are skipped and logged |
| `NOTIFY_EMAIL_TO` | required | optional | Comma-separated list is allowed |
| `NOTIFY_EMAIL_FROM` | required | optional | Must be on a domain verified in Resend, e.g. `Something Clicks <alerts@somethingclicks.com>` |

Recommended: point Preview at a **second free Supabase project**, so test submissions from preview deployments don't land in your real data.

## One-time setup

### 1. Supabase

1. Create a project (free tier; choose a US West region).
2. **SQL Editor:** paste and run `supabase/migrations/20261030000000_init.sql`, or use `supabase db push` with the Supabase CLI. This creates the tables, the rate limiter, and locks every table to the server key (row-level security on, no public policies).
3. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up".
4. **Authentication → Users → Add user:** add your `ADMIN_EMAIL` address.
5. **Authentication → URL Configuration:**
   - Site URL: `https://somethingclicks.com`
   - Redirect URLs: `https://somethingclicks.com/admin/auth/callback` (optional, for admin sign-in on previews: `https://*-<your-vercel-team>.vercel.app/admin/auth/callback`)
6. Copy the project URL, anon key, and service role (secret) key into Vercel.

Free projects pause after about a week with no activity. Visiting the site's forms or admin wakes them; a paused project shows a save error on form submit until it resumes.

### 2. Resend

1. Create an account (free tier: 3,000 emails per month) and add the domain `somethingclicks.com`.
2. Resend shows the DNS records it needs (SPF, DKIM, and a return-path MX, usually on a `send` subdomain). Add each one in Cloudflare DNS exactly as shown, with proxy status **DNS only**, then verify in Resend.
3. Create an API key with sending access and put it in `RESEND_API_KEY`.
4. Optional: in Supabase → Authentication → SMTP Settings, use Resend's SMTP so admin sign-in emails aren't limited by Supabase's built-in sender.

### 3. Vercel

1. **Add New → Project**, import `Something-Clicks/something-clicks`. The framework is detected as Next.js; no build settings need changing.
2. Add the environment variables above, then deploy. Vercel deploys `main` to Production, and every other branch gets a Preview.
3. **Analytics tab → Enable** Web Analytics (cookieless page views).
4. **Settings → Domains:** add `somethingclicks.com` and `www.somethingclicks.com`, and choose which one redirects to the other (recommended: `www` → apex).

Plan note: Vercel's free Hobby plan is for personal, non-commercial use. A business site should be on Vercel Pro.

### 4. Cloudflare DNS → Vercel

In Cloudflare → `somethingclicks.com` → **DNS → Records**. Delete any existing A, AAAA, or CNAME records for `@` and `www` first, then add:

| Type | Name | Content | Proxy status | TTL |
|---|---|---|---|---|
| A | `@` | `76.76.21.21` | DNS only (grey cloud) | Auto |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only (grey cloud) | Auto |

These are Vercel's standard values. Vercel's **Settings → Domains** page shows the exact records for your project: newer projects may show a different A address or a project-specific CNAME target. If they differ, use what Vercel shows. Keep both records **DNS only**: Vercel issues the SSL certificate itself, and Cloudflare's proxy interferes with that. Leave MX and TXT records (email, Resend) untouched.

## Admin

- Go to `/admin`, enter `ADMIN_EMAIL`, and click the emailed link (open it in the same browser). Sessions last 8 hours.
- The overview shows counts by status and 30-day form starts vs. submissions.
- Each list filters by status, category and service area (applications), date range, and text search.
- Open a submission to change its status and add internal notes.
- **Export CSV** downloads the current filtered view (up to 10,000 rows). It opens cleanly in Excel or Google Sheets. Cells that look like spreadsheet formulas are prefixed with `'` for safety.

## How submissions work

1. The browser validates each step with the same Zod schemas the server uses (`src/lib/validation.ts`).
2. The server action (`src/app/(site)/actions.ts`) runs `handleSubmission` (`src/lib/submissions.ts`):
   - silently drops honeypot or too-fast (bot) submissions
   - re-validates everything
   - rate-limits to 5 per hour per form per visitor, using a salted IP hash
   - saves the submission
   - emails the owner
   - records a `form_submit` event
3. Only a failed save is shown to the visitor. Email or analytics failures are logged and never lose a submission.

No customer lists or customer personal data are collected anywhere, and visitors get no cookies.

## Project structure

```
src/
  app/(site)/        public pages, server actions
  app/admin/         login, magic-link callback, protected pages, CSV export
  app/api/events/    first-party form analytics endpoint
  components/        layout, UI primitives, forms
  content/           editable copy, pilot journey, form options
  lib/               validation, submission pipeline, store (Supabase / memory), email, admin auth, CSV
supabase/migrations/ database schema
tests/               Vitest suites
docs/                build specification
```
