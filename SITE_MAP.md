# Something Clicks — Site map

Verified against the code on branch `claude/focused-tesla-vhcm0d`, including the copy simplification that follows
UX-3 (`c18e8c0`). Every route below exists in `src/app` unless it is marked **Missing**.

Status key:

- **Implemented**: built and working in local tests. Not yet tested against a live database or live Stripe.
- **Incomplete**: exists, but placeholder content or open decisions remain.
- **Manual**: the step happens outside the app (by the Something Clicks team).
- **Missing**: no route or feature exists.

## Text sitemap

```
Something Clicks
├── /                         Homepage (two paths: businesses, cleaning companies)
│
├── Businesses
│   └── /book                 Request a walkthrough → "Request received" (same page)
│
├── Cleaning companies
│   ├── /cleaning-companies   The pilot: $750 for 5 qualifying completed walkthroughs
│   ├── /signup               Apply for the pilot (create an account)
│   ├── /auth/callback        Email confirmation link (redirect only)
│   ├── /onboarding           Company details (also "Company settings")
│   ├── /dashboard            Status, available credits, buy the pilot, purchases
│   ├── (Stripe Checkout)     Hosted by Stripe; returns to /dashboard
│   └── /login                Sign in
│
├── Referral partners
│   └── /partners             Application (program not open yet)
│
├── Legal
│   ├── /terms/buyer          Buyer terms (draft)
│   ├── /terms/partner        Partner terms (draft)
│   ├── /privacy              Privacy (placeholder)
│   ├── /terms                Missing (planned main buyer-terms URL)
│   └── /support              Missing
│
├── Admin (admins only)
│   ├── /admin                Overview
│   ├── /admin/buyers         Buyers → /admin/buyers/[id]
│   ├── /admin/packs          Credit packs
│   ├── /admin/applications   Partner applications
│   ├── /admin/requests       Walkthrough requests
│   └── /admin/settings       Settings
│
├── System
│   ├── 404 page              Custom "Page not found"
│   ├── /auth/signout         Sign out (POST, redirect only)
│   └── /api/webhooks/stripe  Stripe events (not a page)
│
└── Missing but needed
    ├── Forgot / reset password
    ├── Resend confirmation email
    ├── /support
    ├── /terms
    └── Error page for unexpected failures (Next.js default is used)
```

## Route inventory

### Public pages

| Route | Audience | Purpose | Primary action | Goes next | Status |
|---|---|---|---|---|---|
| `/` | Everyone | Explain the service; split into two paths | "Request a walkthrough" (businesses) · "See the pilot" (cleaning companies) | `/book` · `/cleaning-companies` | Implemented |
| `/book` | Businesses | Request a walkthrough: 3 sections plus consent | "Send request" | Same page shows "Request received" | Implemented. Live database save not verified |
| `/cleaning-companies` | Cleaning companies | Explain the pilot and the process | "Apply for the pilot" (twice) | `/signup` | Implemented |
| `/partners` | Referral partners | Apply for a program that isn't open yet | "Submit application" | Same page shows a confirmation message | Implemented. Partner approval not built |
| `/terms/buyer` | Cleaning companies | Buyer terms | None | — | Incomplete: draft banner plus 11 open decisions |
| `/terms/partner` | Referral partners | Partner terms | None | — | Incomplete: draft banner plus 11 open decisions |
| `/privacy` | Everyone | Privacy policy | None | — | Incomplete: placeholder |
| `/terms` | Cleaning companies, Stripe | Main buyer-terms URL intended for Stripe | — | — | **Missing** |
| `/support` | Everyone, Stripe | Contact and help | — | — | **Missing**: no support contact decided |
| 404 page | Everyone | Recover from a bad link | "Request a walkthrough" · "For cleaning companies" · homepage link | `/book` · `/cleaning-companies` · `/` | Implemented |

### Cleaning-company account pages

| Route | Audience | Purpose | Primary action | Goes next | Status |
|---|---|---|---|---|---|
| `/signup` | Cleaning companies | "Apply for the pilot": create an account to start the application | "Create account" | "Check your email" message, or `/onboarding` if no confirmation is required | Implemented. Supabase not verified live |
| `/auth/callback` | Cleaning companies | Confirm the email link (redirect only) | — | `/onboarding`, or `/login?error=callback` if the link is bad | Implemented. Not verified live |
| `/login` | Cleaning companies, admins | Sign in | "Sign in" | Requested page (default `/dashboard`); admins go to `/admin` | Implemented. No password recovery |
| `/onboarding` | Signed-in cleaning companies | Company details, service area, what you clean, availability, terms | "Submit for review" (new) · "Save changes" (existing) | `/dashboard?saved=1` | Implemented. Not verified live |
| `/dashboard` | Signed-in cleaning companies | Review status, available credits, buy the pilot, purchases | "Continue to secure checkout" (once approved and a pack exists) | Stripe Checkout | Implemented. Not verified live |
| Stripe Checkout | Approved cleaning companies | Pay for the pilot (hosted by Stripe) | Pay | `/dashboard?checkout=success` or `?checkout=cancelled` | Implemented in test mode. Not verified live |
| `/auth/signout` | Signed-in users | Sign out (POST, redirect only) | — | `/` | Implemented |

**Access rules (verified in `src/lib/auth.ts`):**
- Not signed in: `/dashboard` and `/onboarding` go to `/login?next=…`.
- Admins: go to `/admin`.
- Non-buyer accounts: go to `/login?error=not_buyer`.
- No company details yet: `/dashboard` goes to `/onboarding`.

### Admin pages (admins only; checked in `src/app/admin/layout.tsx` and in every admin action)

| Route | Purpose | Status |
|---|---|---|
| `/admin` | Counts: buyers waiting, applications, requests waiting for a match, purchases needing review | Implemented |
| `/admin/buyers` → `/admin/buyers/[id]` | Approve, reject or suspend buyers (approval sends an email); credit adjustments; ledger; purchases | Implemented |
| `/admin/packs` | Create and switch credit packs on and off. **The $750 pilot pack must be created here** | Implemented. No pack exists until you create one |
| `/admin/applications` | Review and reject partner applications | Incomplete: approval is disabled (waits on PromoteKit) |
| `/admin/requests` | View walkthrough requests | Implemented but view-only: no matching or scheduling actions |
| `/admin/settings` | Price per appointment, commission (internal), dispute window, referral expiry; "Test PromoteKit connection" (one read-only request) | Implemented. Connection test not yet run against PromoteKit |

### Non-page routes
- `/api/webhooks/stripe`: adds credits on confirmed payment; handles refunds, failures and expiry. **Implemented, tested locally only.**

## Navigation

**Header (every page):** "For businesses" (`/#businesses`) · "For cleaning companies" · "Sign in" · "Request a walkthrough".
- Below 1024px these sit behind a menu button.
- "Sign in" still shows when you're already signed in.

**Footer:** "Referral partners" · "Buyer terms" · "Partner terms" · "Privacy". There's no Support link (the page doesn't exist).

**Dashboard header:** "Company settings" (`/onboarding`) · "Sign out".

**Admin header:** Overview · Buyers · Credit packs · Partner applications · Booking requests · Settings · Sign out.

## Customer journeys

### Business customer

| # | Step | Route | Status |
|---|---|---|---|
| 1 | Read the homepage and choose "Request a walkthrough" | `/` | Implemented |
| 2 | Fill in the 3-section form and agree to share details with one company | `/book` | Implemented |
| 3 | Submit; the request is saved as "waiting for match"; repeat requests are marked duplicate | `/book` (server) | Implemented. **Live database save not verified** |
| 4 | "Request received" screen | `/book` | Implemented |
| 5 | Confirmation email to the business; alert email to admin | — | Implemented. Needs Resend set up; not verified live |
| 6 | Something Clicks reviews the request and finds a company | `/admin/requests` (view only) | **Manual** |
| 7 | Walkthrough arranged with the business and the cleaning company | — | **Manual**: no scheduling in the app |

The business has no way to check status or contact Something Clicks afterwards (no support page).

### Cleaning company

| # | Step | Route | Status |
|---|---|---|---|
| 1 | Homepage → "See the pilot" | `/` | Implemented |
| 2 | Read the pilot: $750 for 5 qualifying completed walkthroughs ($150 each) | `/cleaning-companies` | Implemented |
| 3 | "Apply for the pilot": create an account (email and password) | `/signup` | Implemented. Not verified live |
| 4 | Confirm email from the link | `/auth/callback` | Implemented. Depends on Supabase email settings; **not verified live** |
| 5 | Company details → "Submit for review" (admin gets an alert) | `/onboarding` | Implemented. Not verified live |
| 6 | Dashboard shows "We're reviewing your company" | `/dashboard` | Implemented |
| 7 | Admin approves; approval email sent | `/admin/buyers/[id]` | Implemented (admin action). Rejection and suspension send **no** email |
| 8 | Dashboard shows the pilot pack → "Continue to secure checkout" | `/dashboard` | Implemented. **Needs the pilot pack created in `/admin/packs`** |
| 9 | Pay on Stripe Checkout | Stripe | Implemented in test mode. **Not verified live** |
| 10 | Return to the dashboard; credits appear once the Stripe webhook confirms payment | `/dashboard` + webhook | Implemented. **Not verified in a deployed environment** |
| 11 | Walkthroughs arranged by the team | — | **Manual**: the dashboard says tracking isn't available yet |
| 12 | Outcome confirmed, credit used or returned, disputes | — | **Missing in the app.** The ledger supports it, but no appointment workflow exists. Only manual admin credit adjustments are possible |

Steps 3–8 together form the application. The buttons say "Apply for the pilot", and onboarding ends with "Submit for review".

## Navigation and structure issues

1. **Dead end: no account recovery.** `/login` has no "Forgot password?" or "Resend confirmation". An unconfirmed email gets "That email and password don't match."
2. **Dead end: no support.** No `/support` page, no contact method, and no footer link. Businesses and buyers can't ask questions or dispute anything.
3. **Missing `/terms`.** The URL planned for Stripe doesn't exist. Legal pages are drafts or placeholders, and `/cleaning-companies` links to the draft buyer terms.
4. ~~**Wording mismatch.**~~ **Resolved:** `/cleaning-companies`, `/signup` and the sign-in link now say "Apply for the pilot".
5. **Possible empty dashboard.** If no pilot pack exists, approved buyers see "No credit packs are on sale right now" and can't buy.
6. **Silent rejection.** Rejected or suspended buyers get no email; they only see it if they sign in.
7. **Header shows "Sign in" to signed-in users**, and there's no dashboard link in the header.
8. ~~**The partner page is the longest page.**~~ **Resolved:** `/partners` is shortened to who it's for, what to refer and what happens next, plus the form. It still says the program isn't open.
9. ~~**Repetition.**~~ **Resolved:** the repeated homepage line and the duplicated `/cleaning-companies` sentences are removed. The homepage H1 now states the customer value ("Commercial cleaning walkthroughs for Salt Lake Valley businesses.").
10. **No error page** for unexpected failures; the Next.js default would show.
11. **The live site (`main`) still runs the original version.** None of the above improvements are deployed.

## Recommended changes (smallest that matter)

| Priority | Change | Type |
|---|---|---|
| 1 | Deploy the branch once approved (fixes item 11) | Release decision |
| 2 | Account recovery: "Forgot password?" plus a clear unconfirmed-email message (item 1) | Login change; needs approval |
| 3 | Support contact, `/support`, `/terms`, final privacy policy (items 2–3) | Needs your decisions |
| 4 | ~~"Apply for the pilot" wording (item 4)~~ | Done |
| 5 | Create the $750 pilot pack in `/admin/packs` (item 5) | Admin data entry |
| 6 | ~~Trim the repetition and shorten `/partners` (items 8–9)~~ | Done |
| 7 | Rejection email, header dashboard link, error page (items 6, 7, 10) | Small, optional |

The appointment workflow (journey step 12) is the remaining product gap. For the pilot, either run it by hand or
build the planned appointment workflow.

## Verified vs untested

- **Verified in code and locally:** every route above, the access rules, redirects, emails, checkout return URLs, and admin navigation. Public pages were built and run locally in Chromium.
- **Untested:**
  - live database saves (bookings, applications, sign-ups, onboarding);
  - Supabase sign-in and email confirmation;
  - Stripe Checkout and the webhook in a deployed environment;
  - email delivery;
  - the production site;
  - the signed-in pages (onboarding, dashboard, admin) in a browser.
