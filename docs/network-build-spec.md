# Something Clicks Network — Website Build Specification

**Status:** v3. Consolidates the original build prompt, the Step 0 repository findings, the brand, structure, functionality, and boundary requirements added on 2026-10-30, and the build decisions approved the same day (root-level site, small-business setup journey, Cloudflare hosting, official brand colors, placeholder logo).
**Owner:** Matt Hill, Something Clicks LLC (Salt Lake Valley, Utah)
**Purpose:** the single source of truth for the business model, brand standards, page structure, and technical boundaries. If code and this document disagree, this document wins until it is updated.

Remaining open items are marked **[PLACEHOLDER]** in the site and listed in section 10.

---

## 1. Business context

The Something Clicks Network is a managed partnership network that helps independent local businesses gain customers through complementary businesses that already serve the same people. Something Clicks:

1. finds businesses whose customers overlap,
2. matches them,
3. helps them create a joint offer,
4. coordinates how each partner shares that offer with its own customers, and
5. tracks results (referral links, codes, redeemed offers, inquiries).

It is **not** a marketing agency, ad seller, or influencer marketplace.

The model is in a **validation pilot**. Nothing is proven yet, and the site must never imply otherwise.

**Mission:** "Make it easier for independent businesses to grow through the customers, trust, and complementary services already present in their local business community."

---

## 2. The first partnership journey

The site explains the larger Network **and** makes the first opportunity to join concrete. Every page carries both layers:

- **The Network (big picture):** many kinds of complementary local businesses helping each other find customers.
- **The founding pilot (concrete first step):** one named customer journey, the business types we are recruiting for it, and the single tracked collaboration a founding member is asked to run in the first cycle.

**Decided: small-business setup.** Businesses moving into, setting up, or maintaining commercial space. Most of the services they need come one after another (lease → move → furniture → cleaning → IT → signage → maintenance), and the providers of those services are natural partners.

**Implementation rule:** the journey is defined in one content file, `src/content/pilot.ts`, and is not hard-coded across pages. It holds:

- journey name and one-sentence description
- member business types we are recruiting (commercial movers, office furniture installers, commercial cleaners, IT/network setup, signage and print, security/access control, property maintenance, space planning, and similar)
- referral partner types: commercial real estate professionals, property managers, commercial movers, office furniture installers, property maintenance companies
- an example joint offer, labeled illustrative
- what the first cycle asks of a member (one tracked collaboration within 30 days)
- cycle length and application window **[placeholder]**

Changing the lead journey later is a one-file edit. Pages also show that businesses outside the lead journey can still apply and will be kept for future cycles.

---

## 3. Brand identity

### 3.1 Archetype: the Magician (sole archetype)

The Magician makes transformation feel possible by revealing connections other people miss. On this site that means:

- **The reveal is the brand moment.** Show the non-obvious link: "the customer you just helped move needs an organizer tomorrow." The magic is in *seeing* the connection, not in promised outcomes.
- **Voice:** confident, clear, quietly surprising, warm. Short sentences. Plain language. No hype, no exclamation-mark marketing, no jargon such as "synergy" or "ecosystem play".
- **Guardrail:** the Magician never promises results. Transformation is described as *what we are setting out to do* and *how it would work*, never as achieved fact. "Designed to," "aims to," and "in the pilot we will" are the default framings.
- Do not mix in other archetypes (no Hero "crush the competition", no Jester humor, no Caregiver softness as the lead tone).

### 3.2 Color

Official values. All values live as design tokens in one place (`src/app/globals.css` `@theme`), so a swap is a single edit.

| Token | Name | Hex | Primary use |
|---|---|---|---|
| `navy` | Navy | `#15263D` | Body text, header/footer, dark sections |
| `royal` | Royal | `#2853FB` | Primary buttons, links, key headings on light backgrounds |
| `cyan` | Cyan | `#209AFD` | Accent only on light backgrounds; text, icons, and focus rings allowed on navy |
| `ice` | Ice | `#EAF0FF` | Cards, form panels, highlighted sections |
| `cloud` | Cloud white | `#F4F7FB` | Alternating section backgrounds |
| `white` | White | `#FFFFFF` | Page background, text on navy/royal |

Measured contrast (WCAG 2.x; 4.5:1 is needed for normal text, 3:1 for large text and UI components):

| Pair | Ratio | Allowed for |
|---|---|---|
| Navy on white / cloud / ice | 15.3 / 14.2 / 13.4 : 1 | All text |
| Royal on white / cloud / ice | 5.6 / 5.3 / 5.0 : 1 | All text, links, focus rings |
| White on royal | 5.6 : 1 | Button labels, all text |
| White on navy | 15.3 : 1 | All text |
| Cyan on navy | 5.2 : 1 | Text, icons, focus rings on dark sections |
| **Cyan on white / cloud / ice** | **3.0 / 2.8 / 2.6 : 1** | **Decoration only.** Never text, meaningful icons, borders that carry meaning, or focus indicators. |
| **Royal on navy / navy on royal** | **2.7 : 1** | **Never** pair for text or UI. |

### 3.3 Typography

- **Inter** for everything, self-hosted through `next/font` (no runtime call to Google).
- Scale: a restrained type ramp of 4–5 sizes. Headings in weight 600–700 with slightly tight tracking; body in 400 at 16–18px with a 1.6 line height.
- Tabular numerals for any figures in the admin area.

### 3.4 Graphic style

- Clean and minimalist: generous white space, a clear grid, one idea per section.
- Flat shapes, thin lines, and simple geometric illustrations built from the logo's visual language (nodes, arcs, a "click" spark). No stock photography and no images copied from the web.
- Icons: one consistent open-source line set (for example Lucide, ISC license) at one stroke weight.
- Motion: subtle and purposeful, for example a connection line drawing in. It respects `prefers-reduced-motion`.
- Photography is allowed later only from licensed assets Matt provides. Until then, use clearly marked placeholders.

### 3.5 Logo symbol

**Decided:** the developer does not design a logo. Matt will supply the logo file.

- Until then the site uses a clearly marked **temporary placeholder** (`src/components/LogoPlaceholder.tsx`): a dashed outline box labeled "Logo" next to the "Something Clicks" wordmark in Inter.
- Swapping in the real logo means replacing that one component and the favicon/OG image files.
- Requirements for the supplied mark (for reference): distinctive and custom; not a puzzle, handshake, lightbulb, or chain link; recognizable at 16px; works in single color on white and on navy. SVG preferred.

### 3.6 Consistency across pages

All pages share one layout, one navigation, one footer, one button and form component set, one section-heading pattern, and one CTA block. No page-specific one-off styling.

---

## 4. Site structure

### 4.1 The seven pages

| # | Page | Route | Purpose |
|---|---|---|---|
| 1 | Home | `/` | Vision, the problem, how it works in 5 steps, illustrative examples, the founding pilot (section 2), primary CTA "Apply to the founding pilot", secondary CTA for referral partners |
| 2 | How It Works | `/how-it-works` | Map → Qualify → Match → Package (joint offer) → Distribute (each partner shares with its own customers) → Measure → Learn. What a collaboration brief contains. How results are tracked (referral links, codes, redeemed offers, inquiries). |
| 3 | For Businesses | `/for-businesses` | Benefits; what participation asks of an owner (kept light); what founding members receive (curated match with rationale, collaboration brief, ready-to-adapt copy, coordination and reminders, results summary); illustrative pairings; founding pilot free for a limited first cycle; CTA |
| 4 | For Referral Partners | `/referral-partners` | For property managers, consultants, and other well-connected professionals who can introduce businesses. Interest form. Rewards only where permitted and by individual written agreement. **No** specific payout promises. |
| 5 | Join the Network | `/join` | Founding-member application (section 5.1), multi-step with progress indication |
| 6 | About | `/about` | Mission, why Something Clicks exists, founder note **[placeholder for Matt]** |
| 7 | Contact | `/contact` | Contact form, contact email **[placeholder]**, service area (Salt Lake Valley), expected response time **[placeholder]** |

Contact is its own page; About links to it.

### 4.2 Supporting pages (not counted in the seven)

| Route | Purpose |
|---|---|
| `/join/thanks` | This is an application, not a guarantee of acceptance; the team reviews and follows up; response window **[placeholder]** |
| `/referral-partners/thanks`, `/contact/thanks` | Short confirmations, or inline success states (developer's choice; must stay consistent) |
| `/privacy` | Privacy policy. Placeholder text, visibly flagged **"Draft — pending legal review."** |
| `/terms` | Terms of use, including the founding-pilot participation terms and the disclosed-relationship language. Placeholder, flagged **"Draft — pending legal review."** |
| `/admin` | Protected admin dashboard (section 6) |


### 4.3 Navigation and footer

- **Header:** logo → Home, How It Works, For Businesses, Referral Partners, About, Contact, plus a primary button "Apply" → `/join`. On mobile, a hamburger menu with a focus trap, closable with Esc.
- **Footer:** short mission line, page links, Privacy, Terms, contact email, "Something Clicks LLC · Salt Lake Valley, Utah", copyright.

### 4.4 Site location

**Decided:** there is no existing site to protect. The Network is the whole Something Clicks business, and the site is served at the root of `somethingclicks.com`. There is no `/network` base path and no forwarding or subdomain setup.

---

## 5. Forms

All forms:

- **Validation:** one shared Zod schema per form, run on both client and server. The server result is authoritative.
- **Errors:** clear inline error messages tied to fields with `aria-describedby`, plus an error summary that receives focus after a failed submit.
- **Spam:** hidden honeypot field; minimum time-to-submit check; rate limiting by IP (stored in Postgres, no extra service).
- **Attribution:** capture source page, referrer, and `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`. UTMs persist from the landing page for the visit.
- **Privacy:** do **not** ask for customer lists or any customer personal data, anywhere.

### 5.1 Founding-member application (`/join`)

Five steps with a progress indicator ("Step 2 of 5"). Progress is saved in the browser for the session only, and data is sent only on final submit.

1. **Business:** business name; website or main social link; category (select + "Other" text); years in business (range); team size (range); service area (multi-select of Salt Lake Valley cities, see 5.4).
2. **Customers:** ideal customer; typical customer situations/needs; what customers need right before buying from them; what they need right after.
3. **Channels:** how they reach customers today (email list, social, in-person, receipts/packaging, direct introductions, other), each with an approximate audience-size range.
4. **Partnerships and capacity:** businesses they already refer to or receive referrals from; business types they would like to partner with; collaboration interests (joint offer, sharing a partner's offer, co-created content, local event, other); past cross-promotion experience and what worked or failed; realistic time per month; willing to commit to one tracked collaboration in the next 30 days (yes / no / maybe); fit with the current pilot journey (yes / not sure / no, for future cycles).
5. **Contact and consent:** name; role; email; phone (optional); preferred contact method; **required** checkbox to be contacted and agree to the Privacy Policy and Terms; **optional** checkbox for occasional Network updates (unchecked by default).

### 5.2 Referral partner interest (`/referral-partners`)

Name, organization, role, email, phone (optional), types of businesses they could introduce, how they are connected to those businesses, notes, **required** consent checkbox.

### 5.3 Contact (`/contact`)

Name, email, topic (general, founding pilot, referral partners, press, other), message, **required** consent checkbox.

### 5.4 Service-area list

Approved default (kept in `src/content/site.ts` and marked as a placeholder, so it is easy to edit): Salt Lake City, South Salt Lake, Millcreek, Holladay, Murray, Cottonwood Heights, Midvale, Taylorsville, West Valley City, Kearns, Magna, West Jordan, South Jordan, Sandy, Draper, Riverton, Herriman, Bluffdale, plus "Other / outside the valley".

### 5.5 Consent language (draft, pending legal review)

- **Required:** "I agree to be contacted by Something Clicks about this submission and I agree to the [Privacy Policy] and [Terms]."
- **Optional:** "Send me occasional updates about the Something Clicks Network. I can unsubscribe at any time."
- **Under submit buttons:** "Submitting an application does not guarantee acceptance into the founding pilot."
- **Partner promotions:** whenever the site describes partners promoting each other: "Partner promotions are disclosed relationships. Each business tells its customers that it is sharing a partner's offer."

---

## 6. Data, admin, and notifications

### 6.1 Database (Supabase Postgres, free tier)

Tables: `network_applications`, `referral_partner_interests`, `contact_messages`, plus an internal `rate_limits` table.

Every submission table has: `id`, `created_at`, `updated_at`, `status`, `internal_notes`, `source_page`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `consent_contact` (with timestamp), `consent_updates`.

- `network_applications.status`: `new` | `reviewing` | `accepted` | `waitlisted` | `declined`
- `referral_partner_interests.status` and `contact_messages.status`: `new` | `contacted` | `closed`
- Multi-select answers are stored as Postgres arrays and channels as JSONB, so filters and CSV export stay simple.
- Row-level security is on with no public policies. Only server code with the service role key reads or writes.
- Migrations are SQL files in `supabase/migrations/`.

### 6.2 Admin dashboard (`/admin`)

- **The only login on the site.** One admin, restricted to the email in `ADMIN_EMAIL`. Not a member portal.
- Sign-in: Supabase Auth sends a magic link. The callback verifies the link and checks the email against `ADMIN_EMAIL`, then issues an HMAC-signed, httpOnly session cookie (8 hours, `ADMIN_SESSION_SECRET`). Every admin page, action, and export checks that cookie. No passwords are stored anywhere, and no Next.js middleware is needed (keeps the Cloudflare build simple).
- Optional extra layer: put `/admin*` behind Cloudflare Access (free for small teams).
- Tabs for Applications, Referral partners, and Contact messages.
- List views filtered by status, category, and service area, plus a date range and text search.
- Detail view showing every field.
- Inline status change and internal-notes editing.
- CSV export of the current filtered view.
- `noindex`; excluded from the sitemap.

### 6.3 Email notifications

- One email to the owner for each new submission: type, key fields, and a link to the admin detail view.
- Provider: Resend free tier (needs domain DNS records). Configured with `RESEND_API_KEY`, `NOTIFY_EMAIL_TO`, and `NOTIFY_EMAIL_FROM`.
- If email fails, the submission is still saved and the error is logged. The visitor never sees an email error.
- No automated emails to applicants in v1 (open item: add a simple "we received your application" auto-reply later?).

---

## 7. SEO and analytics

- Unique title, meta description, canonical URL, Open Graph and Twitter tags, and an OG image (brand template) for every page.
- `sitemap.xml` for public pages; `robots.txt` that disallows `/admin`.
- Structured data: `Organization` with Salt Lake Valley area served. No review or rating markup.
- **Analytics:** basic and privacy-respecting. Track page views plus `form_start` and `form_submit` events for each form, with the form name and step. No personal data goes into analytics.
- **Decided:** page views come from **Cloudflare Web Analytics** (free, cookieless, no consent banner). It does not support custom events, so `form_start` and `form_submit` are recorded **first-party** in a small `form_events` table: no cookies, no personal data, just form name, event, step, source page, and UTM fields. Counts appear in the admin dashboard.
- No other trackers. The Cloudflare beacon loads only when `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` is set, or Web Analytics can be switched on in the Cloudflare dashboard with no code.

---

## 8. Quality and trust requirements

- **Responsive:** designed mobile-first, tested at 360px, 768px, 1024px, and 1440px, with no horizontal scroll.
- **Accessible (WCAG 2.2 AA):** semantic landmarks and heading order; every input labeled; full keyboard navigation; visible focus states (cyan ring on dark, royal ring on light); contrast per section 3.2; skip-to-content link; reduced-motion support.
- **Fast:** static rendering for content pages, self-hosted font, SVG-only graphics. Lighthouse targets of at least 90 for performance and at least 95 for accessibility, best practices, and SEO on mobile.
- **Copy rules:**
  - no guaranteed results
  - no invented statistics or numbers presented as findings
  - no testimonials, member counts, partner names, or partner logos
  - every example labeled **"Illustrative example"**
  - partner promotions described as disclosed relationships
  - "free for a limited first cycle" always tied to the pilot terms
- **Images:** no images copied from the web. Use icons, the custom illustrations from section 3.4, assets Matt provides, or clearly marked placeholders.

---

## 9. Technical stack and boundaries

### 9.1 Stack (free tiers; no paid service without Matt's approval)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS with the section 3 tokens |
| Database and admin auth | Supabase (Postgres + Auth) |
| Validation | Zod (shared client/server) |
| Tests | Vitest for schemas, submission handling, rate limiting, sessions, and CSV export (DB and email replaced with in-memory fakes) |
| Hosting | **Cloudflare Workers** using the OpenNext Cloudflare adapter (`@opennextjs/cloudflare`); DNS is already on Cloudflare |
| Email | Resend REST API called with `fetch` (no SDK) |

Known free-tier tradeoffs:

- Supabase free projects pause after about 1 week of inactivity. A scheduled keep-alive ping, or the steady flow of submissions, prevents it.
- The Cloudflare Workers free plan caps the compressed worker at 3 MiB and CPU time at 10 ms per request. Content pages are prerendered to keep CPU low. If either limit is hit, Workers Paid is $5/month and needs Matt's approval.
- Next.js image optimization is not used (SVG and icons only), so no Cloudflare Images setup is needed.

### 9.2 In scope

All seven pages plus the supporting pages, three forms, the database, the single-admin dashboard, email notifications, responsive layouts, basic SEO and analytics, privacy/terms/consent language, tests, and README.

### 9.3 Out of scope for v1 (do not build)

- Member portals, member accounts, or any login other than the single admin
- Automated business matching
- Public business directories
- Marketplace functionality
- Payment processing
- Automated commission or referral-reward tracking
- Complex CRM integrations

Design the data model so these can be added later, but build none of them.

### 9.4 Working rules

- Keep commits small and descriptive.
- Ask before any destructive change, any new paid service, or any change that would affect the existing somethingclicks.com site.

---

## 10. Decisions

### Decided (2026-10-30)

| Decision | Outcome |
|---|---|
| Site location | Root of somethingclicks.com; no `/network` base path |
| First partnership journey | Small-business setup (`src/content/pilot.ts`) |
| Hosting | Cloudflare Workers via OpenNext |
| Brand colors | Official values in section 3.2 |
| Logo | Marked temporary placeholder until Matt supplies the file |
| Analytics | Cloudflare Web Analytics plus first-party form events |
| Privacy/terms | Flagged draft pages at `/privacy` and `/terms` |

### Still open (marked placeholders in the site)

| # | Item | Where |
|---|---|---|
| 1 | Contact email and notification inbox | `src/content/site.ts`, env vars |
| 2 | Response window (thanks pages, contact) | `src/content/site.ts` |
| 3 | Founder note | `src/content/site.ts` |
| 4 | Pilot cycle length and application window | `src/content/pilot.ts` |
| 5 | Service-area city list (approved draft) | `src/content/site.ts` |
| 6 | Logo file, favicon, OG image | `src/components/LogoPlaceholder.tsx`, `public/` |
| 7 | Legal review of privacy, terms, and consent wording | `/privacy`, `/terms`, `src/content/site.ts` |
| 8 | Applicant auto-reply email | Off in v1 |

---

## 11. Deliverables

1. Working pages, forms, database migrations, and admin area.
2. Tests for form validation and submission handling.
3. README: local setup, environment variables, deployment, admin access, CSV export.
4. Summary of what changed, what was left untouched, and the open decisions that remain.
