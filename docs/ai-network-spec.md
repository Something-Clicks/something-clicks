# Something Clicks — AI Network Specification

**Status:** v2, **approved 2026-10-30**. Extends [`network-build-spec.md`](network-build-spec.md). Source: the updated AI network brief (first ecosystem: **weddings**) and Matt's answers, recorded in section 14.
**Rule:** build in the phases in section 13, with a commit per step. Stop and ask before any paid service, any import above free-tier limits, or any email sending.

**Guiding principle:** the database creates the possibilities; participating businesses create the network.

---

## 1. What changes

Something Clicks becomes a national business-matching product. Its one action is **"Find your business matches."**

- Business records come from **Overture Maps Places**, imported selectively by cluster (a geography plus a customer journey). Launch is **one ecosystem in one metro: weddings in the Salt Lake Valley**. Launching in winter gives vendors their quiet season to claim profiles before the January–March booking peak.
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
| **Wedding categories** (35 taxonomy values, 17 categories, section 5) | **2,297** of the 56,181 cleaned Salt Lake Valley places match by category: **741 wedding-specific** and **1,556 broad** (salons 983, bakeries 291, jewelers 155, flower and gift shops 127). Name rules add **153** more (78 photographers filed as `professional_service`, plus caterers, florists, venues and DJs), for **2,450 total**. Of those, 1,174 have an email address. |
| Wedding-specific counts (category + name) | planners 196 · photographers 173 · hair and makeup 124 · caterers 78 · florists 69 · venues 66 · rentals 57 · bridal and formal wear 51 · DJs and music 27 · limos 27 · videographers 13 · cake makers 7 · stationery 6 |
| **Coverage gap** | Overture under-counts home-based wedding vendors (photographers, DJs, makeup artists, cake makers) and venues filed under other categories. Section 7.2 adds **"Add your business"** so these vendors can join. |
| Source datasets (SLV) | Overture, Overture-signals, BrightQuery, Meta, Microsoft, Uberall, DAC, PinMeTo (CDLA-Permissive-2.0); Foursquare (Apache-2.0); AllThePlaces (CC0-1.0) |
| Measured storage | 660 bytes per place in Postgres 16, including indexes (primary key, location, category, locality, name-search trigram). Planned at **750 bytes per place** after adding a PostGIS location column. |
| Build environment | The S3 bucket is reachable, but DuckDB's extension server is blocked from this session. That shapes the import design in section 3. |

---

## 3. Data pipeline

### 3.1 Import job (`scripts/overture/`)

Python, run from **GitHub Actions** (`workflow_dispatch` with a cluster ID; the repo is public, so minutes are free) or locally.

1. **Find the release:** query the STAC catalog for the newest places release. If that fails, list `release/` in the bucket and take the latest folder.
2. **Extract:** DuckDB queries Overture's Parquet on S3 directly, with a bounding-box filter, wherever its `httpfs` extension can load (GitHub Actions, a laptop). Where it can't (this build environment), the job reads only the matching row groups with PyArrow over HTTPS and writes a local Parquet extract for DuckDB to query. That is the method that produced the section 2 numbers. No GeoPandas.
3. **Clean and classify with DuckDB** on the local extract, using SQL files in the repo:
   - Keep only records that are inside the cluster geometry, have a US address and a name, and are not `permanently_closed` or `temporarily_closed`.
   - Keep confidence ≥ threshold (**0.6**, approved).
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
| **Test cluster:** Salt Lake Valley × weddings | 2,450 | ~1.8 MB | ~5 MB | ✅ |
| Salt Lake Valley, every mapped category | ≤ 56,181 | ≤ 42 MB | only for active-cluster categories | ✅ |
| Utah statewide, every category | ~136,000 | ~100 MB | — | ✅ |
| National, wedding categories (measured: 685,545) | ~685,000 | ~515 MB | — | ❌ **Supabase Pro required** |
| National, every category | ~14.5 million | ~10.9 GB | — | ❌ **Pro plus about 3 GB of extra disk** |
| National counts table (mapped categories only) | 0.35–0.55M rows | ~20–35 MB | — | ✅ |

**Free-tier ceiling:** about 400 MB, which is roughly 150,000 clustered places with matches, or about 500,000 places without matches. Supabase Pro ($25/month) includes 8 GB of disk; extra disk is billed per GB. Prices should be confirmed on Supabase's pricing page before upgrading. **Nothing in phases 1–2 needs Pro.**

### 4.2 AI cost

Model: **Claude Haiku 5.5** (`claude-haiku-5-5`), $0.10 per million input tokens and $0.50 per million output tokens. The Batch API halves both.

| Task | Tokens per item (in / out) | Cost per item (standard / batch) | Test cluster | Notes |
|---|---|---|---|---|
| Enrich a business (services, customer type, "serves weddings?", one-line summary) | ~700 / ~120 | $0.00013 / $0.000065 | 2,450 → **$0.32 / $0.16** | Active clusters and claimed profiles only. Confirms which broad-category businesses (salons, bakeries) actually serve weddings. |
| Match rationale (≤ 25 words) | ~400 / ~70 | $0.000075 / $0.0000375 | ~6,000 unique top-5 pairs → **$0.45 / $0.23** | Rule-based templates cover all other matches for free |
| National enrichment, wedding categories (not planned) | | | ~640k → $83 / $42 | Shown for scale only |

- **Spend cap:** `AI_MONTHLY_BUDGET_USD` = **$10** (approved). Every call is logged to `ai_usage` with tokens and cost.
- Before any batch, the admin sees an estimate made with the token-counting API on a sample, multiplied by the item count. A batch that would push the month past the cap is refused.
- No AI runs on homepage searches.

### 4.3 Other running costs

| Service | Free tier | When it costs money |
|---|---|---|
| Supabase | 500 MB database | Pro, $25/month, past about 400 MB of places and matches |
| Resend | 3,000 emails/month, 100/day | The test cluster has 1,174 addresses, so a full batch takes about 12 days at 100/day. Batches are approved one at a time anyway. |
| SMS (phone-code verification) | none | Twilio or similar, about $0.01 per message plus about $1/month for a number. **Deferred**, section 7.2 |
| GitHub Actions | free for public repos | — |
| Vercel | already flagged: Hobby plan is non-commercial | — |
| Census Gazetteer, Overture | free | — |

---

## 5. Customer journeys and classification

### 5.1 Journey map (`src/content/journeys.ts`, the single source of truth)

A journey is a sequence of customer moments, and each moment has categories. A category is our label over one or more Overture `taxonomy.primary` values, with plural copy ("wedding photographers") and search synonyms ("photographer", "wedding photography").

**First journey: weddings.** It follows an engaged couple: planning → booking vendors → wedding week → after.

| Stage | Categories (taxonomy values; *broad* = only some of them serve weddings) |
|---|---|
| Planning | planners (`wedding_planning`, `party_and_event_planning`), venues (`event_venue`), bridal and formal wear (`bridal_shop`, `formal_wear_store`), jewelers (*broad*), stationery |
| Booking vendors | photographers, videographers, florists (`florist`, `wholesale_florist`; flower and gift shops *broad*), caterers, DJs and music (`dj_service`, `band_orchestra_symphony`, `event_technology_service`), rentals (party, audiovisual, photo booth, clothing), cake makers (`patisserie_cake_shop`, `cupcake_shop`; bakeries and dessert shops *broad*), limos |
| Wedding week | hair and makeup (`makeup_artist`, `hair_stylist`, `skin_care_and_makeup`, `esthetician`; beauty and hair salons *broad*) |
| After | travel agents (*broad*, honeymoons): added later |

**Name rules** pick up vendors filed under general categories. For example, "… Photography" filed as `professional_service` becomes photographers. They are applied only when the taxonomy value isn't already mapped, and recorded with `classified_by = 'name_rule'`. "Rentals" alone is not enough (it matches equipment and truck rental); it needs "party", "event", "tent", "linen" or "photo booth".

More ecosystems (small-business setup, moving and new home, health and fitness) are added as data in the same file, with no code changes. The small-business-setup map measured in v1 of this spec is kept for later.

### 5.2 Complements (rules)

Wedding vendors serve the same couple for the same event, so most cross-category pairs complement each other. Same-category pairs (photographer + photographer) are competitors and never match.

| Relationship | Strength | Reason template | Default partnership |
|---|---|---|---|
| Hub pairs: planner or venue with any vendor | 1.0 | "They plan the weddings you work." / "Couples book them first, then you." | Referral |
| Day-of pairs (photographer + florist, caterer + cake maker, DJ + venue, hair and makeup + photographer, rentals + venue) | 0.9 | "They work the same weddings you do." | Joint offer |
| Same couple, different moment (bridal shop + hair and makeup, jeweler + photographer) | 0.7 | "Your couples need them right before you." / "…right after you." | Referral |
| Any other wedding pair | 0.6 | "They serve the same couples." | Distribution |
| Either side in a *broad* category | × 0.6 | (same templates) | Raised to full strength once enrichment or the owner confirms wedding services |

### 5.3 AI enrichment (phase 3)

Only for businesses in active clusters or with claimed profiles. Inputs are the imported fields plus anything the owner entered. We do not crawl websites. The output is structured JSON:

- services (up to 8 tags)
- serves weddings: yes, no, or unclear (decides whether a broad-category business counts as a wedding vendor)
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

### 7.1 States and what we may call them

| Database state | What the site and emails may call it |
|---|---|
| `listed` (imported, unclaimed) | "Potential partner" / **"Not on Something Clicks yet"** |
| `claimed` (owner claimed the profile) | "Claimed business" |
| `verified` (owner verified the information) | "Verified business" |
| `member` (owner opted in to the network) | "Network member" |

- Never imply an imported business has joined, approved a partnership, is waiting to connect, or agreed to receive referrals.
- Never call imported records "verified."
- Every count shown comes from live records. "Illustrative" labels appear only on mock examples, never on real results.

| Viewer | Sees |
|---|---|
| Anonymous visitor | Categories, counts, distance bands, and the reason each fits. **No business names.** |
| Signed-in, claimed owner | Names of matched businesses, each labeled with its state as in the table above. Non-members show **"Not on Something Clicks yet"** with an **Invite** button. |
| Public | A profile page (`/b/{slug}`) only for members who turn it on. **No public directory.** Unclaimed records never get a public page and are never indexed. |

### 7.2 Claim flow (step 1, one screen)

1. Search by business name and city. This uses trigram search, limited to imported clusters plus a "Can't find it?" request.
2. Pick the business. The form is prefilled: name, category, address, phone, website.
3. Verify (approved methods):
   - **Email at the business's website domain:** the owner enters `name@theirdomain.com`, and the magic link to that address is the proof. Free email domains are refused. On success the state becomes `verified`.
   - **Manual review by Matt:** goes to the admin queue, with an optional note. The business is `claimed` while pending and `verified` once approved.
   - **Code to the listed phone:** postponed, because it needs a paid SMS provider.
4. Confirm a few fields (service areas, a short description) and choose whether to **join the network** (`member`) and turn on a public profile. Done.

**Can't find your business?** **"Add your business"** creates a member-submitted record with name, category, website, service area and city. It is marked `source = 'member'`, needs the same verification, and is never mixed into Overture attribution. This matters for weddings, where many vendors are home-based and missing from Overture.

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

- **Cluster invitations (admin):** generate drafts for non-member businesses in an active cluster that have an imported Overture email address. Matt reviews the template and recipient list, then **approves each batch**. **Nothing sends without that approval.**
- **Message pattern:** "We found [N] wedding businesses near you that could send you referrals. See who they are." [N] is a live count. Never "waiting to connect." The sender name is truthful and the subject line accurate.
- **Sending domain:** `hello.somethingclicks.com`, a separate subdomain verified in Resend, so invitation reputation never affects the main domain or owner notifications.
- **Hard block:** all invitation sending is disabled until `MAILING_ADDRESS` is set. The address is currently **[ADDRESS]**, still to be supplied. The send action refuses to run, and the admin shows why.
- **Member Invite button:** sends the **one approved template** to the business's imported email, or to an address the member enters. Limits: 10 per member per day, 50 per month.
- **CAN-SPAM compliance, on every message:**
  - identifies Something Clicks as the sender, with an honest subject line
  - includes the physical mailing address (`MAILING_ADDRESS`; sending blocked until set)
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
| Cluster overview | Per cluster: listed, claimed, verified and member counts; available matches; introductions requested and accepted; partnerships live. The 50–100 claimed-business target is a planning hypothesis; real engagement decides when to expand. |
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
  - the reason line ("14 florists near you. They work the same weddings you do.")
  - what you could do together (referrals, shared offer, joint promotion)
  - CTA **"See who they are"** → claim and sign-up
  - Empty state: "No matches here yet." plus an email capture for when the area opens.
- **Four-step section** (visual, replaces How It Works), then "Better together.", then the brand line and the final CTA.
- **Price wording, used verbatim and nowhere else:** "Free to claim your business and see your matches."

### 11.3 Site map after the rewrite

| Route | Status |
|---|---|
| `/` | Rewritten: search hero, results, four steps |
| `/matches` | New: shareable results |
| `/claim`, `/claim/[id]` | New: step 1 |
| `/dashboard/*` | New: matches, requests, partnerships, profile |
| `/b/[slug]` | New: opt-in public member profile |
| `/referral-partners` | Rewritten for weddings (venue coordinators, planners, and other well-connected wedding pros): interest form |
| `/about`, `/contact` | Rewritten to the new tone |
| `/privacy`, `/terms` | Updated for imported data, AI processing (Anthropic as a processor), accounts, introductions, invitations, removal **[Legal review]** |
| `/data-sources`, `/remove-my-business`, `/unsubscribe` | New |
| `/how-it-works`, `/for-businesses` | **Retired** with 301 redirects to `/` (approved) |
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
2. `journeys.ts` with the **weddings** map, name rules and synonyms, plus the seed script
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

## 14. Decisions (answered 2026-10-30)

| # | Decision | Answer |
|---|---|---|
| 1 | Test cluster | **Salt Lake Valley × weddings** (2,450 places) |
| 2 | Confidence threshold | **≥ 0.6**; keep unknown operating status, drop closed |
| 3 | AI monthly cap | **$10** |
| 4 | Claim verification | **Email at the business domain + Matt's manual review**; phone codes postponed |
| 5 | CAN-SPAM mailing address | **[ADDRESS]**; all invitation sending is blocked until it is set |
| 6 | Retire How It Works, For Businesses, Join | **Yes**, with redirects to `/` and `/claim` |
| 7 | Price wording | **"Free to claim your business and see your matches."** Nothing else about price. |
| 8 | Invitations to Overture business emails | **Yes**, active clusters only, each batch approved by Matt, sent from **hello.somethingclicks.com** |
| 9 | Google Analytics | Loads only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set, and the legal pages mention GA only then (merged in Something-Clicks/something-clicks#2) |

Still open: the production Supabase project and the `SUPABASE_DB_URL` secret, needed before the test cluster loads anywhere but local Postgres.
