# Launch day: one pass, start to finish

Until these steps are done, the live site shows friendly "coming soon" states for search, claiming, sign-in and city pages, never an error page. Everything to take Something Clicks live, in the order to do it. Follow it top to bottom once. Each step says where to click and what "done" looks like. If anything doesn't match, stop and send me a screenshot.

**Time:** about 2½ hours, most of it waiting on data loads. You can do the waiting steps in a second browser tab.

**Have open:** GitHub, Vercel, Supabase, Cloudflare and Resend, all signed in. Keep your password manager handy.

**Your live check:** after step 5, **somethingclicks.com/admin/setup** shows every requirement in green or red, with a one-line fix for each red item. Use it as your progress bar.

---

## 1. Merge the code (10 min)

The finished work is on four branches. Merge them in this order, because each one builds on the one before.

| Order | Branch | What it adds |
|---|---|---|
| 1 | `claude/ai-network-phase2` | New homepage, claim flow, accounts, introductions, new pages |
| 2 | `claude/setup-checklist` | The `/admin/setup` checklist and this document |
| 3 | `claude/phase3-ai` | AI review and match reasons (off until you add a key), outcome dashboard |
| 4 | `claude/city-pages` | Pages for the five launch metros |

For each branch, in order:

1. Go to **github.com/Something-Clicks/something-clicks** → **Pull requests** → **New pull request**.
2. Set **base: main** and **compare:** the branch. Click **Create pull request**, then **Create pull request** again.
3. Wait for the checks to go green, then click **Merge pull request** → **Confirm merge**.

Or tell me "open the PRs" at the start of the session, and I'll open all four for you to review and merge.

**Done when:** Vercel → **Deployments** shows a new Production deployment from `main` marked **Ready**. It will show errors until steps 2–4 are done; that's expected.

## 2. Supabase settings (10 min)

You already have the project. Collect values here; you'll paste them in step 4.

1. **Project Settings** (gear) → **API Keys**. Copy:
   - the **Publishable** (anon) key, for `SUPABASE_ANON_KEY`
   - the **Secret** (service_role) key, for `SUPABASE_SERVICE_ROLE_KEY`
2. **Project Settings → Data API**. Copy the **Project URL**, for `SUPABASE_URL`.
3. Click **Connect** (top bar) → **Connection String** → **URI**. Copy two strings, replacing `[YOUR-PASSWORD]` with the database password in each:
   - **Transaction pooler**, port **6543**: for Vercel (`SUPABASE_DB_URL`).
   - **Session pooler**, port **5432**: for GitHub (step 6).
   - If the password contains symbols, URL-encode them (`@` → `%40`, `#` → `%23`, `/` → `%2F`), or reset it to letters and numbers under **Project Settings → Database**.
4. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up".
5. **Authentication → Users → Add user → Create new user:** your admin email, tick **Auto Confirm User**, then **Create user**. Skip this if you've done it before.
6. **Authentication → URL Configuration:**
   - **Site URL:** `https://somethingclicks.com`
   - **Redirect URLs → Add URL:** `https://somethingclicks.com/admin/auth/callback`

## 3. Resend: email for sign-in links (15 min, plus DNS wait)

Members sign in with emailed links, so this must work before launch.

1. **resend.com → Domains → Add Domain:** `somethingclicks.com`, region **us-east-1**.
2. Resend shows 3–4 DNS records (MX, SPF and DKIM TXT records). In another tab, open **Cloudflare → somethingclicks.com → DNS → Records**, and for each Resend record:
   - **Add record**, with the same **Type**, **Name** and **Content**. For MX, set the priority Resend shows.
   - **Proxy status:** DNS only (grey cloud).
   - **Save.**
3. Back in Resend, click **Verify DNS Records**. It can take a few minutes; carry on and check back.
4. **Resend → API Keys → Create API Key:** name `something-clicks-production`, permission **Sending access**, domain `somethingclicks.com`. Copy it for `RESEND_API_KEY`.

## 4. Vercel environment variables (10 min)

**Vercel → something-clicks → Settings → Environment Variables.** For each row: **Add New**, Key, Value, tick the environments shown, **Save**.

| Key | Value | Production | Preview |
|---|---|---|---|
| `SITE_URL` | `https://somethingclicks.com` | ✓ | |
| `SUPABASE_URL` | Project URL (step 2.2) | ✓ | ✓ |
| `SUPABASE_ANON_KEY` | Publishable key (2.1) | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (2.1), mark **Sensitive** | ✓ | ✓ |
| `SUPABASE_DB_URL` | **Transaction pooler**, port 6543 (2.3), mark **Sensitive** | ✓ | ✓ |
| `ADMIN_EMAIL` | your admin email | ✓ | ✓ |
| `ADMIN_SESSION_SECRET` | 48 random characters from your password manager's generator | ✓ | ✓ |
| `RATE_LIMIT_SALT` | another long random string | ✓ | ✓ |
| `RESEND_API_KEY` | Resend key (3.4), mark **Sensitive** | ✓ | ✓ |
| `NOTIFY_EMAIL_TO` | where new-submission alerts should go | ✓ | ✓ |
| `NOTIFY_EMAIL_FROM` | `Something Clicks <hello@somethingclicks.com>` | ✓ | ✓ |

Leave these **unset** for now: `ANTHROPIC_API_KEY` (AI stays off), `MAILING_ADDRESS` and `INVITE_EMAIL_FROM` (invitations stay off), and `GA_MEASUREMENT_ID` (optional).

Then **Deployments** → **⋯** on the latest Production deployment → **Redeploy** → **Redeploy**.

## 5. Connect the domain (10 min, plus DNS wait)

1. **Vercel → Settings → Domains → Add:** `somethingclicks.com`. When Vercel asks, also add `www.somethingclicks.com`, redirecting to `somethingclicks.com`.
2. Vercel shows the DNS records it needs (usually an **A** record for `@` and a **CNAME** for `www`). In **Cloudflare → DNS → Records**, add each one exactly as shown, with **Proxy status: DNS only** (grey cloud). Delete any older `@` or `www` records that conflict.
3. Wait until both domains show **Valid Configuration** in Vercel. This usually takes a few minutes.
4. Open **https://somethingclicks.com/admin**, enter your admin email, and click the link that arrives.
5. Open **https://somethingclicks.com/admin/setup**. The **Vercel environment variables**, **Database (Supabase)** and **Domain** sections should be green.
6. Click **Send test email** and check your inbox. If it fails, Resend probably hasn't finished verifying (step 3.3).

## 6. GitHub secret (2 min)

1. **GitHub → the repo → Settings → Secrets and variables → Actions → New repository secret.**
2. Name: `SUPABASE_DB_URL`. Secret: the **Session pooler** string, port **5432** (step 2.3). Click **Add secret**.

## 7. Database migrations (5 min)

1. **GitHub → Actions → Overture import → Run workflow.** Branch **main**, job **migrate**, cluster **default**, mode **dry-run** → **Run workflow**.
2. Open the run when it finishes. The summary lists the files it would apply. Your database already has the first two, so expect:
   - `…matching`, `…metro_and_national`, `…skip_unchanged_matches`
   - `…members_claims_introductions`
   - the phase 3 file (`…ai_review_and_outcomes`)
3. Run it again with job **migrate**, mode **load**. Each file should say **applied**. The dry run in step 1 only lists files; it changes nothing.
4. Refresh **/admin/setup**: **Database migrations** and **GitHub Actions** are green.

5. **Seed check:** job **matches**, cluster **default** (that's `dfw-weddings`), mode **dry-run**. It loads no business data and takes seconds. The summary should start with `{"journeys": 1, "categories": 17, "complements": 266, "clusters": 6}`, then `dfw-weddings: 0 match suggestions` (zero is right: no data yet).

**Don't start step 8 until steps 3 and 5 succeed.** Every data job checks first and stops with "The database is missing N migration(s)" if any are pending.

## 8. Data loads (about 90 min, mostly waiting)

Each load is a run of **Actions → Overture import → Run workflow**, on branch **main**. Set **job** and **cluster** exactly as in the table; every cluster is a choice in the dropdown. For `import`, do a **dry-run** first and check the summary's **Projected total** is under 400 MB before running the same job in **load** mode. Run them one at a time, in this order:

| # | job | cluster | Time per run | Notes |
|---|---|---|---|---|
| 1 | `national` | `default` | ~15 min | ZIP counts and the location lookup. Search works everywhere after this. |
| 2 | `import` | `us-weddings` | ~15 min | About 240,000 wedding businesses, US-wide |
| 3 | `import` | `dfw-weddings` | ~5 min | Adds DFW's broad categories (salons, bakeries…) |
| 4 | `matches` | `dfw-weddings` | ~1 min | No dry-run needed; mode is ignored. Never `us-weddings` (national) |
| 5 | `import` | `atl-weddings` | ~5 min | |
| 6 | `matches` | `atl-weddings` | ~1 min | |
| 7 | `import` | `hou-weddings` | ~5 min | |
| 8 | `matches` | `hou-weddings` | ~1 min | |
| 9 | `import` | `phx-weddings` | ~5 min | |
| 10 | `matches` | `phx-weddings` | ~1 min | |
| 11 | `import` | `bna-weddings` | ~5 min | |
| 12 | `matches` | `bna-weddings` | ~1 min | |

`matches` only accepts the five metro clusters; `default` means `dfw-weddings`. Picking `us-weddings` for matches, or a cluster for `migrate` or `national`, stops in the first step ("Check inputs") with a message saying what to choose, before anything touches the database.

Locally, the whole set came to about 335 MB. If a dry run projects more than 400 MB, stop there and tell me. The load refuses on its own anyway.

**Done when:** **/admin/setup → Data loads** is all green.

Then **Vercel → Deployments → ⋯ on the latest Production deployment → Redeploy**. Until the data was loaded, the city pages and the search said "coming soon"; the redeploy rebuilds them with the real counts right away (otherwise they refresh within the hour).

## 9. Final check (15 min)

1. **/admin/setup** says **Ready to launch**. Only the "Later" items are grey.
2. **Homepage:** **somethingclicks.com** shows "Good businesses know other good businesses." with the "See who fits." example and a live count ("240,000+").
3. **Search:** enter "Florist" and "Plano, TX" → **Find my matches**. You should see category cards with counts and no business names.
4. **City page:** **somethingclicks.com/weddings/dallas-fort-worth** shows DFW counts by category.
5. **Sign-in:** in a private window, open **/sign-in**, enter a personal email, and click the emailed link. You land on "Claim your business".
6. **Admin:** **/admin/network** lists the six clusters as active; **Claims**, **Removals**, **Invitations** and **Outcomes** all open.
7. **Data sources:** **/data-sources** shows the Overture credits and the release date.

That's launch. 🎉

---

## After launch, when you're ready

- **AI review and match reasons:** add `ANTHROPIC_API_KEY` in Vercel and Redeploy. Runs are capped at $10 a month and start only when you press **Run** in **/admin/network/ai**.
- **Invitations:** set `MAILING_ADDRESS` and `INVITE_EMAIL_FROM` (verify `hello.somethingclicks.com` in Resend first). Batch sending is the next build; nothing sends until you approve a batch.
- **Legal:** the Privacy and Terms pages are still marked as drafts for attorney review.
