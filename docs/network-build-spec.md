# Something Clicks Network — Website Build Specification

**Status:** v2. Consolidates the original build prompt, the Step 0 repository findings, and the brand, structure, functionality, and boundary requirements added on 2026-10-30.
**Owner:** Matt Hill, Something Clicks LLC (Salt Lake Valley, Utah)
**Purpose:** the single source of truth for the business model, brand standards, page structure, and technical boundaries. If code and this document disagree, this document wins until it is updated.

Items marked **[DECISION]** are still open; see section 10.

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

**[DECISION] Which journey leads.** Candidates: moving / new home, weddings / events, health / fitness, small-business setup.
**Recommendation:** moving / new home. Its before-and-after needs are obvious to visitors, there are many independent providers in the Salt Lake Valley, and the joint offer is easy to picture.

**Implementation rule:** the journey is defined in one content file (`src/content/pilot.ts` or equivalent), not hard-coded across pages. It holds:

- journey name and one-sentence description
- target business types (for example, for moving / new home: movers, home organizers, cleaners, handypeople, painters, real estate agents, property managers, local furniture/decor shops)
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

Proposed hex values. **[DECISION]** Confirm them, or supply official values. All values live as design tokens in one place (Tailwind theme and CSS variables) so a swap is a single edit.

| Token | Name | Proposed hex | Primary use |
|---|---|---|---|
| `navy` | Deep navy | `#0B1F4D` | Body text, headers/footers, dark sections |
| `royal` | Royal blue | `#1E4FD8` | Primary buttons, links, key headings |
| `cyan` | Cyan | `#00B8E6` | Accent: logo spark, highlights, focus rings, icons on dark |
| `ice` | Ice blue | `#E6F3FC` | Section backgrounds, cards, form panels |
| `white` | White | `#FFFFFF` | Page background, text on navy/royal |

Measured contrast (WCAG 2.x):

| Pair | Ratio | Allowed for |
|---|---|---|
| White on navy | 15.9 : 1 | All text |
| Navy on ice | 14.1 : 1 | All text |
| White on royal | 6.6 : 1 | All text, buttons |
| Royal on white | 6.6 : 1 | Links, headings, body text |
| Royal on ice | 5.9 : 1 | All text |
| Cyan on navy | 6.8 : 1 | All text, focus rings on dark |
| **Cyan on white** | **2.3 : 1** | **Decoration only. Never text, icons that carry meaning, or the only focus indicator on light backgrounds.** |

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

A distinctive custom mark. **Not allowed:** puzzle pieces, handshakes, lightbulbs, chain links, or generic "network graph" clip art.

Design brief:

- **Concept:** two separate arcs or paths that, at one precise point, lock into alignment and release a small spark. This is the moment something "clicks" between two businesses that already shared customers.
- **Construction:** geometric, with no more than 2–3 shapes. Recognizable at 16px (favicon) and 512px.
- **Colors:** royal and navy, with a cyan spark. It must also work in single-color white on navy and single-color navy on white.
- **Lockups:** symbol only; symbol + "Something Clicks"; symbol + "Something Clicks Network".
- **Deliverables:** SVG source, favicon set, Open Graph image template.
- The developer drafts an SVG concept for review. Matt approves it before it is treated as final. **[DECISION]** Approve the concept, or supply a professionally designed mark.

### 3.6 Consistency across pages

All pages share one layout, one navigation, one footer, one button and form component set, one section-heading pattern, and one CTA block. No page-specific one-off styling.

---

## 4. Site structure

### 4.1 The seven pages

| # | Page | Route | Purpose |
|---|---|---|---|
| 1 | Home | `/network` | Vision, the problem, how it works in 5 steps, illustrative examples, the founding pilot (section 2), primary CTA "Apply to the founding pilot", secondary CTA for referral partners |
| 2 | How It Works | `/network/how-it-works` | Map → Qualify → Match → Package (joint offer) → Distribute (each partner shares with its own customers) → Measure → Learn. What a collaboration brief contains. How results are tracked (referral links, codes, redeemed offers, inquiries). |
| 3 | For Businesses | `/network/for-businesses` | Benefits; what participation asks of an owner (kept light); what founding members receive (curated match with rationale, collaboration brief, ready-to-adapt copy, coordination and reminders, results summary); illustrative pairings; founding pilot free for a limited first cycle; CTA |
| 4 | For Referral Partners | `/network/referral-partners` | For property managers, consultants, and other well-connected professionals who can introduce businesses. Interest form. Rewards only where permitted and by individual written agreement. **No** specific payout promises. |
| 5 | Join the Network | `/network/join` | Founding-member application (section 5.1), multi-step with progress indication |
| 6 | About | `/network/about` | Mission, why Something Clicks exists, founder note **[placeholder for Matt]** |
| 7 | Contact | `/network/contact` | Contact form, contact email **[placeholder]**, service area (Salt Lake Valley), expected response time **[placeholder]** |

Contact is its own page; About links to it.

### 4.2 Supporting pages (not counted in the seven)

| Route | Purpose |
|---|---|
| `/network/join/thanks` | This is an application, not a guarantee of acceptance; the team reviews and follows up; response window **[placeholder]** |
| `/network/referral-partners/thanks`, `/network/contact/thanks` | Short confirmations, or inline success states (developer's choice; must stay consistent) |
| `/network/privacy` | Privacy policy. Placeholder text, visibly flagged **"Draft — pending legal review."** |
| `/network/terms` | Terms of use, including the founding-pilot participation terms and the disclosed-relationship language. Placeholder, flagged **"Draft — pending legal review."** |
| `/admin/network` | Protected admin dashboard (section 6) |

If somethingclicks.com already has a privacy policy, link to it instead of creating `/network/privacy`. **[DECISION]**

### 4.3 Navigation and footer

- **Header:** logo → Home, How It Works, For Businesses, Referral Partners, About, Contact, plus a primary button "Apply" → `/network/join`. On mobile, a hamburger menu with a focus trap, closable with Esc.
- **Footer:** short mission line, page links, Privacy, Terms, contact email, "Something Clicks LLC · Salt Lake Valley, Utah", copyright.

### 4.4 Hosting and base path

- Routes live under `/network` so they can be served at `somethingclicks.com/network`, forwarded from the existing host, or moved to a subdomain such as `network.somethingclicks.com` without code changes (the base path is configurable). **[DECISION]** Choose the host and domain approach.
- Existing somethingclicks.com pages, forms, and tracking are not in this repo and must not be touched.

---

## 5. Forms

All forms:

- **Validation:** one shared Zod schema per form, run on both client and server. The server result is authoritative.
- **Errors:** clear inline error messages tied to fields with `aria-describedby`, plus an error summary that receives focus after a failed submit.
- **Spam:** hidden honeypot field; minimum time-to-submit check; rate limiting by IP (stored in Postgres, no extra service).
- **Attribution:** capture source page, referrer, and `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`. UTMs persist from the landing page for the visit.
- **Privacy:** do **not** ask for customer lists or any customer personal data, anywhere.

### 5.1 Founding-member application (`/network/join`)

Five steps with a progress indicator ("Step 2 of 5"). Progress is saved in the browser for the session only, and data is sent only on final submit.

1. **Business:** business name; website or main social link; category (select + "Other" text); years in business (range); team size (range); service area (multi-select of Salt Lake Valley cities, see 5.4).
2. **Customers:** ideal customer; typical customer situations/needs; what customers need right before buying from them; what they need right after.
3. **Channels:** how they reach customers today (email list, social, in-person, receipts/packaging, direct introductions, other), each with an approximate audience-size range.
4. **Partnerships and capacity:** businesses they already refer to or receive referrals from; business types they would like to partner with; collaboration interests (joint offer, sharing a partner's offer, co-created content, local event, other); past cross-promotion experience and what worked or failed; realistic time per month; willing to commit to one tracked collaboration in the next 30 days (yes / no / maybe); fit with the current pilot journey (yes / not sure / no, for future cycles).
5. **Contact and consent:** name; role; email; phone (optional); preferred contact method; **required** checkbox to be contacted and agree to the Privacy Policy and Terms; **optional** checkbox for occasional Network updates (unchecked by default).

### 5.2 Referral partner interest (`/network/referral-partners`)

Name, organization, role, email, phone (optional), types of businesses they could introduce, how they are connected to those businesses, notes, **required** consent checkbox.

### 5.3 Contact (`/network/contact`)

Name, email, topic (general, founding pilot, referral partners, press, other), message, **required** consent checkbox.

### 5.4 Service-area list

Proposed default; **[DECISION]** confirm or edit: Salt Lake City, South Salt Lake, Millcreek, Holladay, Murray, Cottonwood Heights, Midvale, Taylorsville, West Valley City, Kearns, Magna, West Jordan, South Jordan, Sandy, Draper, Riverton, Herriman, Bluffdale, plus "Other / outside the valley".

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

### 6.2 Admin dashboard (`/admin/network`)

- **The only login on the site.** One admin, Supabase Auth magic link, restricted to the email in `ADMIN_EMAIL`. No passwords in code. Not a member portal.
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
- No automated emails to applicants in v1. **[DECISION]** Add a simple "we received your application" auto-reply?

---

## 7. SEO and analytics

- Unique title, meta description, canonical URL, Open Graph and Twitter tags, and an OG image (brand template) for every page.
- `sitemap.xml` for public pages; `robots.txt` that disallows `/admin`.
- Structured data: `Organization` with Salt Lake Valley area served. No review or rating markup.
- **Analytics:** basic and privacy-respecting. Track page views plus `form_start` and `form_submit` events for each form, with the form name and step. No personal data goes into analytics.
- **[DECISION] Analytics provider.** If Google Analytics already runs on somethingclicks.com, reuse that property. Otherwise the recommendation is **Cloudflare Web Analytics** or **Vercel Web Analytics**: both free, cookieless, and no consent banner needed. GA4 is free too, but it sets cookies and the privacy policy would need to say so.
- Only one analytics tool. Configured by environment variable; with nothing set, no tracking script loads.

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
| Email | Resend |
| Validation | Zod (shared client/server) |
| Tests | Vitest for schemas, server actions, rate limiting, and CSV export, with DB and email mocked; Playwright smoke test for the join flow |
| Hosting | **[DECISION]** Vercel Hobby is free but limited to non-commercial use, so Vercel Pro ($20/month) is the compliant Vercel option. Cloudflare Pages and Netlify have free tiers that allow commercial use. |

Known free-tier tradeoff: Supabase free projects pause after about 1 week of inactivity. A scheduled keep-alive ping, or the steady flow of submissions, prevents it.

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

## 10. Open decisions

| # | Decision | Recommendation / default until decided |
|---|---|---|
| 1 | First partnership journey | Moving / new home (all copy reads from `pilot.ts`) |
| 2 | Confirm hex values | Use the section 3.2 values |
| 3 | Logo: approve developer concept or supply professional mark | Developer drafts the SVG concept from section 3.5 |
| 4 | Host and domain approach (`/network` forwarding vs subdomain) | Build under `/network` with a configurable base path |
| 5 | Hosting provider | Cloudflare Pages or Netlify (free, commercial use allowed), or Vercel Pro |
| 6 | Analytics provider / existing GA | Cloudflare Web Analytics; off until configured |
| 7 | Existing privacy policy URL | Create flagged placeholder `/network/privacy` and `/network/terms` |
| 8 | Contact email and notification inbox | Placeholder `hello@somethingclicks.com` |
| 9 | Response window (thanks pages, contact) | Placeholder "within [X] business days" |
| 10 | Service-area city list | Section 5.4 list |
| 11 | Founder note | Placeholder for Matt |
| 12 | Pilot cycle length and application window | Placeholders in `pilot.ts` |
| 13 | Applicant auto-reply email | Off in v1 |

---

## 11. Deliverables

1. Working pages, forms, database migrations, and admin area.
2. Tests for form validation and submission handling.
3. README: local setup, environment variables, deployment, admin access, CSV export.
4. Summary of what changed, what was left untouched, and the open decisions that remain.
