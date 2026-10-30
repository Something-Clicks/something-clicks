# Something Clicks — AI Network Specification

**Status:** draft for approval (2026-10-30). Extends [`network-build-spec.md`](network-build-spec.md). Source brief: the AI network brief (sections 1–7).
**Rule:** nothing below gets built until Matt approves this document. After approval, work proceeds in the phases in section 13, with a commit per step. Stop and ask before any paid service, any import above free-tier limits, or any email sending.

Items marked **[DECISION]** are listed in section 14.

---

## 1. What changes

Something Clicks becomes a national business-matching product. Its one action is **"Find your business matches."**

- Business records come from **Overture Maps Places**, imported selectively by cluster (a geography plus a customer journey).
- Owners **claim** their business, see **matches** with a clear reason each fits, request **introductions** (contact details shared only when both sides accept), and set up a **referral, shared offer, or promotion**.
- Rules do the first pass. **Claude Haiku 5.5** enriches only businesses in active clusters or with claimed profiles, under a monthly spend cap.
- The existing stack stays: Next.js on Vercel, Supabase, Resend, the admin area, and the brand. Existing pages are rewritten to the copy principles in section 11.

---

## 2. Verified facts (measured 2026-10-30)

| Item | Finding |
|---|---|
| Latest release | `2026-10-21.0`, found by listing `release/` in `s3://overturemaps-us-west-2`. The STAC catalog (`stac.overturemaps.org`) did not respond from the build environment, so the import tries STAC first and falls back to the bucket listing. |
| Places files | 16 Parquet files, 11.9 GB, 88,418,121 places worldwide |
| Fields available | `id` (GERS ID), `names`, `basic_category` (285 values), `taxonomy` (`primary` plus `hierarchy`, about 1,400 values), `confidence`, `operating_status`, `websites`, `phones`, `emails`, `socials`, `addresses`, `sources` (dataset and license for each source), `brand`, `bbox`, `geometry`, `version` |
| US places | **18,445,270** |
| Operating status (US) | open 13.0M · not stated 4.8M · permanently closed 638k · temporarily closed 168 |
| Confidence (US) | ≥0.5: 16.3M · ≥0.6: 15.1M · ≥0.7: 13.9M · ≥0.8: 12.4M · ≥0.9: 11.0M |
| US, not closed and confidence ≥0.6 | **14,490,932** |
| Salt Lake Valley (bbox −112.20, 40.40 → −111.70, 40.85) | 71,241 places; **56,181** after cleaning. Of those, 49,922 have a phone, 48,785 a website, and 16,867 an email address. Only 109 are duplicates (same normalized name within about 50 m). |
| Small-business-setup categories (67 taxonomy values, section 5) | **7,175** of the 56,181 cleaned Salt Lake Valley places (12.8%): lease 1,975 · move 619 · set up 3,782 · operate 799. Of these, 6,104 have a website and 2,077 an email address. |
| Source datasets (SLV) | Overture, Overture-signals, BrightQuery, Meta, Microsoft, Uberall, DAC, PinMeTo (CDLA-Permissive-2.0); Foursquare (Apache-2.0); AllThePlaces (CC0-1.0) |
| Measured storage | 660 bytes per place in Postgres 16, including indexes (primary key, location, category, locality, name-search trigram). Planned at **750 bytes per place** after adding a PostGIS location column. |
| Build environment | The S3 bucket is reachable, but DuckDB's extension server is blocked from this session. That shapes the import design in section 3. |

---

## 3. Data pipeline

### 3.1 Import job (`scripts/overture/`)

Python, run from **GitHub Actions** (`workflow_dispatch` with a cluster ID; the repo is public, so minutes are free) or locally.

1. **Find the release:** query the STAC catalog for the newest places release. If that fails, list `release/` in the bucket and take the latest folder.
2. **Extract:** read only the Parquet row groups whose bounding box intersects the cluster area, and only the columns we need. PyArrow does this over HTTPS range requests and writes a local Parquet extract. This is the method that produced the section 2 numbers. It needs no DuckDB extension, so it runs anywhere.
3. **Clean and classify with DuckDB** on the local extract, using SQL files in the repo:
   - Keep only records that are inside the cluster geometry, have a US address and a name, and are not `permanently_closed` or `temporarily_closed`.
   - Keep confidence ≥ threshold (default **0.6** **[DECISION]**).
   - Map `taxonomy.primary` to our categories (section 5). Drop unmapped categories (parks, ATMs, schools, places of worship and so on), plus junk names (all digits, all punctuation, under 2 characters).
   - **Deduplicate:** same normalized name (lowercased, punctuation stripped, "&" → "and") within 50 m, or the same website domain plus phone within 200 m. Keep the highest-confidence record and record the merged GERS IDs.
   - **Normalize:**
     - phone to E.164
     - website to its origin, social links kept separately
     - address fields from `addresses[0]`
     - first email kept for outreach only, never shown publicly
4. **Suppression check:** drop any record whose GERS ID, website domain, phone or email is on the suppression list.
5. **Load:** upsert into `places` by GERS ID through a staging table and `COPY`, keyed on `SUPABASE_DB_URL` (a GitHub secret). Records that disappear from a new release are marked `stale`, not deleted.
6. **Report:** write an `import_runs` row with rows read, kept, and dropped by reason (closed, low confidence, unmapped, junk, duplicate, suppressed), the projected database size, and the release.

**Dry run first, always.** Every import runs in `--dry-run` mode first. That prints the row counts and projected size against the free-tier budget, and the admin must confirm before the load step. An import whose projected total would pass the free-tier budget refuses to load and says Supabase Pro is required.

### 3.2 National count summary (`place_counts`)

Anonymous search must work anywhere in the US, but we import full records only for clusters. So the import job also produces a **national counts table**:

- one row per ZIP code and mapped category with the number of places, with no names
- built from the same national scan used in section 2 (about 7 minutes)
- estimated at 0.35–0.55 million rows, **about 20–35 MB**

Distances for counts are measured from ZIP-code centers. That means anonymous visitors anywhere get real counts, while names and exact distances exist only inside imported clusters.

### 3.3 Location lookup

"Where do you serve customers?" accepts a city or ZIP code. It resolves against the US Census Gazetteer files (ZIP-code centers and incorporated places, public domain, about 66k rows, about 6 MB) loaded into `geo_lookup`. No paid geocoder is needed.

### 3.4 Attribution (`/data-sources`)

A public page listing:

- "Business listings include data from the Overture Maps Foundation (overturemaps.org), release {release}, made available under the Community Data License Agreement – Permissive 2.0."
- Each underlying dataset with its license, generated from the `source_datasets` present in imported data: Foursquare (Apache 2.0) and AllThePlaces (CC0 1.0) alongside the CDLA sources.
- How to request removal (section 7.5) and how the data is used.

Linked from the footer. **[Legal review]** of the attribution wording.

---

## 4. Storage and cost estimates

### 4.1 Database size

The free tier allows 500 MB. After existing tables, `geo_lookup` and `place_counts`, about **400 MB** is left for places and matches.

| Scope | Places | Places size | Matches (about 2 KB per clustered place) | Fits free tier? |
|---|---|---|---|---|
| **Test cluster:** Salt Lake Valley × small-business setup | 7,175 | ~5 MB | ~15 MB | ✅ |
| Salt Lake Valley, every mapped category | ≤ 56,181 | ≤ 42 MB | only for active-cluster categories | ✅ |
| Utah statewide, every category | ~136,000 | ~100 MB | — | ✅ |
| National, small-business-setup categories | ~1.85 million | ~1.4 GB | — | ❌ **Supabase Pro required** |
| National, every category | ~14.5 million | ~10.9 GB | — | ❌ **Pro plus about 3 GB of extra disk** |
| National counts table (mapped categories only) | 0.35–0.55M rows | ~20–35 MB | — | ✅ |

**Free-tier ceiling:** about 400 MB, which is roughly 150,000 clustered places with matches, or about 500,000 places without matches. Supabase Pro ($25/month) includes 8 GB of disk; extra disk is billed per GB. Prices should be confirmed on Supabase's pricing page before upgrading. **Nothing in phases 1–2 needs Pro.**

### 4.2 AI cost

Model: **Claude Haiku 5.5** (`claude-haiku-5-5`), $0.10 per million input tokens and $0.50 per million output tokens. The Batch API halves both.

| Task | Tokens per item (in / out) | Cost per item (standard / batch) | Test cluster | Notes |
|---|---|---|---|---|
| Enrich a business (services, customer type, one-line summary) | ~700 / ~120 | $0.00013 / $0.000065 | 7,175 → **$0.93 / $0.47** | Active clusters and claimed profiles only |
| Match rationale (≤ 25 words) | ~400 / ~70 | $0.000075 / $0.0000375 | ~18,000 unique top-5 pairs → **$1.35 / $0.67** | Rule-based templates cover all other matches for free |
| National enrichment, journey categories (not planned) | | | ~1.85M → $240 / $120 | Shown for scale only |

- **Spend cap:** `AI_MONTHLY_BUDGET_USD` (default **$10** **[DECISION]**). Every call is logged to `ai_usage` with tokens and cost.
- Before any batch, the admin sees an estimate made with the token-counting API on a sample, multiplied by the item count. A batch that would push the month past the cap is refused.
- No AI runs on homepage searches.

### 4.3 Other running costs

| Service | Free tier | When it costs money |
|---|---|---|
| Supabase | 500 MB database | Pro, $25/month, past about 400 MB of places and matches |
| Resend | 3,000 emails/month, 100/day | A cluster invitation batch (test cluster: up to 2,077 addresses) takes about 3 weeks at 100/day, or needs Resend Pro (about $20/month) **[DECISION]** |
| SMS (phone-code verification) | none | Twilio or similar, about $0.01 per message plus about $1/month for a number. **Deferred**, section 7.2 |
| GitHub Actions | free for public repos | — |
| Vercel | already flagged: Hobby plan is non-commercial | — |
| Census Gazetteer, Overture | free | — |

---

## 5. Customer journeys and classification

### 5.1 Journey map (`src/content/journeys.ts`, the single source of truth)

A journey is a sequence of customer moments, and each moment has categories. A category is our label over one or more Overture `taxonomy.primary` values, with plural copy ("commercial movers") and search synonyms ("movers", "moving company").

**First journey: small-business setup** (67 taxonomy values, measured in section 2):

| Stage | Example categories (taxonomy values) |
|---|---|
| Lease | commercial real estate, property management, real estate agents, shared office space |
| Move | movers, furniture assembly, office furniture and supply stores, storage, dumpster rental |
| Set up | IT services, internet and phone providers, sign makers, printers, security systems, locksmiths, interior design, painters, flooring, electricians, contractors, web and graphic designers, marketing agencies, insurance agents, accountants, bookkeepers, attorneys |
| Operate | janitorial and office cleaning, carpet cleaning, pest control, HVAC, plumbing, landscaping, handymen, equipment repair |

More journeys (moving and new home, weddings and events, health and fitness) are added as data in the same file, with no code changes.

### 5.2 Complements (rules)

`complements` rows are derived from the journey map:

| Relationship | Strength | Reason template | Default partnership |
|---|---|---|---|
| Adjacent stages (A immediately before B) | 1.0 | "They meet your customers right before you do." / "…right after you do." | Referral |
| Same stage, different category | 0.7 | "Your customers need both in the same week." | Joint offer |
| Two stages apart | 0.4 | "They serve the same businesses at a different moment." | Distribution |
| Hand-tuned pair (e.g. movers + furniture installers) | override | custom line | custom |

### 5.3 AI enrichment (phase 3)

Only for businesses in active clusters or with claimed profiles. Inputs are the imported fields plus anything the owner entered. We do not crawl websites. The output is structured JSON:

- services (up to 8 tags)
- customer type (B2B, B2C or both)
- a corrected category, if confident
- a one-line summary

Results are stored in `enrichments` with the model and date. An owner's own edits always win.

---

## 6. Matching engine

**Score** (0–1) = 0.5 × **C** + 0.3 × **D** + 0.2 × **S**:

- **C, complement strength** (section 5.2). Zero means not a match.
- **D, distance** = exp(−distance / R), with R = 10 km by default (set per cluster) and a 40 km cutoff.
- **S, service overlap:** overlap of service areas (imported locality plus owner-entered areas) plus a customer-type match (from enrichment). It is 0.5 when unknown.

Each business keeps its **top 15 matches with a score of at least 0.35**. Matches are computed per cluster in SQL using PostGIS `ST_DWithin`, triggered by an admin button or after an import.

`matches` stores:

- place A, place B and the score with its three components
- the suggested partnership type: referral, joint offer, or distribution. Rules pick it (adjacent stages → referral, same moment → joint offer, a partner with a large audience channel → distribution), and admin or AI can override.
- the template key and an optional AI rationale (phase 3; admin can edit)
- status: suggested, approved, hidden, introduced, connected, or live

---

## 7. Business states, accounts, and visibility

### 7.1 States

**listed** (imported, internal) → **claimed** (owner verified) → **member** (opted in to being matched and introduced).

| Viewer | Sees |
|---|---|
| Anonymous visitor | Categories, counts, distance bands, and the reason each fits. **No business names.** |
| Signed-in, claimed owner | Names of matched businesses. Non-members are labeled **"Not on Something Clicks yet"** with an **Invite** button. A listed business is never shown as a member. |
| Public | A profile page (`/b/{slug}`) only for members who turn it on. **No public directory.** Unclaimed records never get a public page and are never indexed. |

### 7.2 Claim flow (step 1, one screen)

1. Search by business name and city. This uses trigram search, limited to imported clusters plus a "Can't find it?" request.
2. Pick the business. The form is prefilled: name, category, address, phone, website.
3. Verify, in order of preference:
   - **Email at the business's website domain:** the owner enters `name@theirdomain.com`, and the magic link to that address is the proof. Free email domains are refused.
   - **Manual review:** goes to the admin queue, with an optional note.
   - **Code to the listed phone:** **deferred**, because it needs a paid SMS provider **[DECISION]**.
4. Confirm a few fields: service areas, a short description, and an optional public profile toggle. Done.

### 7.3 Member accounts

- Supabase Auth magic link, kept separate from the existing single-admin sign-in. Session refresh uses `@supabase/ssr` with a Next.js proxy. Row-level security limits members to their own profile, claims, introductions and partnerships. Match names come only from server code after a claim check.
- **Dashboard** (`/dashboard`): Matches, Requests, Partnerships, Profile. No wizard longer than one screen.

### 7.4 Introductions and partnerships (steps 3–4)

- **Request an introduction** with one click and an optional one-line note.
  - If the other business is a member, they get an email and a dashboard request. When **both accept**, each side sees the other's contact details.
  - If they aren't a member, the button becomes **Invite** (section 8).
- **Grow together:** pick a referral, shared offer, or promotion, and fill in a few fields: offer text, an optional code, and an optional link. A tracking link is generated per partner.
  - Progress is shown as **Matched → Introduced → Connected → Partnership live**.
  - Rate limits: 20 introduction requests per member per day.

### 7.5 Removal and suppression

- `/remove-my-business`: anyone can request removal of an imported record (business name, city, contact email).
- Each request adds the GERS ID, website domain and phone to the `suppression` list, hides the record immediately, and excludes it from future imports.
- Email suppression (unsubscribes, bounces, removals) is stored as normalized addresses and checked before every send.

---

## 8. Outreach (in scope, gated)

- **Cluster invitations (admin):** generate drafts for non-member businesses in an active cluster that have an imported email address. The admin reviews the template and recipient list, then **approves a batch** of a set size. **Nothing sends without that approval.**
- **Member Invite button:** sends the **one approved template** to the business's imported email, or to an address the member enters. Limits: 10 per member per day, 50 per month.
- **CAN-SPAM compliance, on every message:**
  - identifies Something Clicks as the sender, with an honest subject line
  - includes the physical mailing address **[PLACEHOLDER]**
  - has a clear one-click unsubscribe (link plus `List-Unsubscribe` headers)
  - opt-outs take effect **immediately**, inside the 10-business-day requirement
  - the suppression list is checked right before each send
  - no purchased lists
- Sending capacity depends on the Resend plan (section 4.3). **[Legal review]** of the template.

---

## 9. Admin additions

| Area | What it does |
|---|---|
| Imports | Dry-run results, run history, kept and dropped by reason, size against budget, release |
| Clusters | Create and edit: name, journey, center and radius or a list of localities, confidence threshold, status (draft, importing, active, paused) |
| Match explorer (phase 1) | Pick a business and see its scored matches with components; approve, hide, or edit the rationale |
| Claims queue | Approve or reject manual claims and see verification evidence |
| Invitations | Drafts, approved batches, sent, unsubscribed and bounced |
| Suppression and removals | Search, add, and process removal requests |
| AI usage | Spend this month against the cap, plus per-batch estimates and results |
| Legacy | The existing applications, referral and contact lists stay as they are |

---

## 10. Data model (new tables)

- `places`:
  - `id` (bigint), `gers_id` (unique), `release`, `name`, `category_id`, `taxonomy_primary`, `taxonomy_hierarchy`
  - `website`, `phone`, `email` (never public), address fields, `geog` (PostGIS point), `confidence`
  - `source_datasets`, `state` (listed, claimed, member), `stale`, `suppressed`, `cluster_ids`, `merged_gers_ids`, timestamps
- `categories`, `journeys`, `journey_stages`, `complements` (seeded from `journeys.ts`)
- `place_counts` (`zcta`, `category_id`, `n`, `release`) and `geo_lookup` (`kind`, `name`, `state`, `zcta`, `geog`)
- `clusters` and `import_runs`
- `matches` (`place_a`, `place_b`, `score`, `c`, `d`, `s`, `partnership_type`, `template_key`, `ai_rationale`, `status`, `cluster_id`)
- `enrichments` and `ai_usage`
- `profiles` (`user_id` → `place_id`, public toggle, description, service areas), `place_claims` (method, status, evidence)
- `introductions` and `partnerships` (type, stage, details, tracking code)
- `invitations`, `invitation_batches`, `suppression` and `removal_requests`

Row-level security is on everywhere. Public access goes only through server routes that return aggregates.

---

## 11. Product and copy

### 11.1 Principles (applied to every page)

1. **No pilot language.** No "pilot," "founding members," "test," "validate," "early access," or "apply." Only working features are shown. No invented counts, results, testimonials, or statistics: every number shown comes from the database at render time.
2. **One action: "Find your business matches."** Every page leads to it.
3. **Four steps:** Tell us about your business → See your matches → Make a connection → Grow together.
4. **Apple-style copy:** short and benefit-first, one idea per section, headlines under 8 words, no paragraphs about AI. Brand line: **"Make the complicated click."**
5. **Show, don't tell:** real product UI (search, match cards, dashboard) is the main visual. No small labels above headings (already done).

### 11.2 Homepage

- **Hero:**
  - Headline: **"Good businesses know other good businesses."**
  - Inputs: **"What does your business do?"** (autocomplete over category labels and synonyms) and **"Where do you serve customers?"** (city or ZIP)
  - Button: **"Find my matches"**
- **Results** (in place, with a shareable URL `/matches?what=&where=`): up to six category cards, each showing
  - the count within 25 km and the nearest distance band
  - the reason line ("12 commercial movers near you. They meet your customers right before you do.")
  - what you could do together (referrals, shared offer, joint promotion)
  - CTA **"See who they are"** → claim and sign-up
  - Empty state: "No matches here yet." plus an email capture for when the area opens.
- **Four-step section** (visual, replaces How It Works), then "Better together.", then the brand line and the final CTA.

### 11.3 Site map after the rewrite

| Route | Status |
|---|---|
| `/` | Rewritten: search hero, results, four steps |
| `/matches` | New: shareable results |
| `/claim`, `/claim/[id]` | New: step 1 |
| `/dashboard/*` | New: matches, requests, partnerships, profile |
| `/b/[slug]` | New: opt-in public member profile |
| `/referral-partners` | Rewritten: "Know great local businesses?" interest form |
| `/about`, `/contact` | Rewritten to the new tone |
| `/privacy`, `/terms` | Updated for imported data, AI processing (Anthropic as a processor), accounts, introductions, invitations, removal **[Legal review]** |
| `/data-sources`, `/remove-my-business`, `/unsubscribe` | New |
| `/how-it-works`, `/for-businesses` | **Retired** with 301 redirects to `/` **[DECISION]** |
| `/join` | **Retired**, 301 redirect to `/claim`; existing applications stay in admin |

**Screenshot gate:** after the new homepage and match cards are built (phase 2), I send screenshots and wait for approval before rebuilding the other pages.

---

## 12. Security and abuse limits

- Search: 30 per minute per visitor (hashed IP). It returns aggregates only.
- Claim attempts: 5 per hour per visitor. Email-domain verification refuses free email domains.
- Introductions: 20 per member per day. Invites: 10 per day and 50 per month. Admin batches send only on approval.
- Imported emails are never exposed to the browser. Members see a business's contact details only after mutual acceptance.
- `ANTHROPIC_API_KEY` and `SUPABASE_DB_URL` are server and CI secrets only.

---

## 13. Phases (a commit per step)

**Phase 1: data foundation (no public changes)**

1. Schema migration (PostGIS; places, categories, journeys, complements, clusters, import runs, counts, geo lookup, suppression)
2. `journeys.ts` with the small-business-setup map and synonyms, plus the seed script
3. Import job (release discovery, extract, DuckDB cleaning, dedupe, suppression, dry run, load, report) with tests on a fixture extract
4. Census Gazetteer loader and the national counts job
5. **Dry run of the test cluster, results shown to Matt, then the load after approval**
6. Rules classification and the matching engine (SQL plus tests)
7. Admin: imports, clusters, match explorer

**Phase 2: product**

1. Homepage search and `/matches` results, then **screenshots for approval**
2. Member auth, claim flow (email-domain verification and manual review), admin claims queue
3. Dashboard: match cards with names, introduction requests, mutual acceptance
4. Grow-together tools and progress tracking
5. `/data-sources`, `/remove-my-business`, suppression
6. Copy rewrite of the remaining pages, redirects, and legal page updates

**Phase 3: AI and outreach**

1. Anthropic client, `ai_usage` logging, spend cap, batch estimator
2. Enrichment batches (active clusters and claims)
3. AI match rationales, with admin editing
4. Invitations: templates, approval batches, unsubscribe, suppression checks (**no sending until Matt approves**)
5. Outcome tracking: tracking links and codes, partnership progress, results in the dashboard and admin

---

## 14. Decisions needed before phase 1

| # | Decision | Recommendation |
|---|---|---|
| 1 | Test cluster | Salt Lake Valley × small-business setup (7,175 places, about 20 MB with matches) |
| 2 | Confidence threshold | **0.6**, keeping records with no stated operating status (26% of US records) and dropping closed ones |
| 3 | AI monthly cap | $10 to start; the test cluster's full enrichment plus rationales is about $2.30 at standard rates |
| 4 | Phone-code verification | Defer (paid SMS). Ship email-domain plus manual review. |
| 5 | Invitation sending capacity | Start on Resend free (100/day) and decide on Pro before the first cluster batch |
| 6 | CAN-SPAM mailing address | Needed before any invitation is sent (a PO box is acceptable) |
| 7 | Retire `/how-it-works`, `/for-businesses`, `/join` | Yes, with 301 redirects |
| 8 | Price wording | The brief doesn't cover pricing. Recommendation: say nothing about price until it's decided, or "Free to claim your business" if that's true. |
| 9 | Using imported business emails for admin invitations | Yes, for businesses in active clusters only, behind batch approval and suppression checks |
| 10 | Supabase Pro | Not needed for phases 1–2. Needed before going past about 400 MB (for example, national coverage for one journey). |
