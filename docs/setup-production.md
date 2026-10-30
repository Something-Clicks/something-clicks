# Production setup: Supabase, Vercel, GitHub Actions

Click-by-click steps for connecting the live site and the Overture import to your Supabase project. Do the parts in order.

---

## Part 1: Supabase project

If you already created the project, skip to step 4.

1. Go to **supabase.com/dashboard** and click **New project**.
2. Fill in:
   - **Organization:** yours
   - **Project name:** `something-clicks`
   - **Database password:** click **Generate a password**, then **copy it and save it in your password manager**. You need it in Part 3.
   - **Region:** **East US (North Virginia)**, the same area as Vercel's default region
   - **Plan:** Free
3. Click **Create new project** and wait about 2 minutes for it to finish.
4. In the left sidebar, open **Project Settings** (gear icon) → **API Keys**. You'll copy these values in Part 4:
   - **Publishable key** (or **anon** on the *Legacy API keys* tab) → `SUPABASE_ANON_KEY`
   - **Secret key** (or **service_role** on the *Legacy API keys* tab) → `SUPABASE_SERVICE_ROLE_KEY`. Keep this private.
5. Open **Project Settings → Data API** and copy the **Project URL** (`https://xxxx.supabase.co`) → `SUPABASE_URL`.

## Part 2: Run the migrations

**Easiest (works from a phone):** once the GitHub secret from Part 5 is set, go to **Actions** → **Overture import** → **Run workflow**, set **job** to `migrate` and **mode** to `dry-run`, and run it. The summary lists the files it would apply. Run it again with **mode** `load` to apply them. It applies only the files that are missing, in order, each in its own transaction, and stops at the first error. Files you already ran in the SQL Editor are recognised by name and skipped. Running it again when nothing is missing changes nothing.

**Or by hand:** run all the files, **in this order**, from the `supabase/migrations` folder in the GitHub repo, skipping any you've already run:

1. `20261030000000_init.sql`
2. `20261031000000_network_foundation.sql`
3. `20261031010000_matching.sql`
4. `20261031020000_metro_and_national.sql`
5. `20261031030000_skip_unchanged_matches.sql`
6. `20261101000000_members_claims_introductions.sql` (accounts, claims, introductions; arrives with phase 2)

For each file:

1. On GitHub, open the file and click the **Copy raw file** button (two overlapping squares, top right of the file view).
2. In Supabase, click **SQL Editor** in the left sidebar → **+ New query**.
3. Paste and click **Run** (or press Ctrl/⌘ + Enter).
4. You should see **"Success. No rows returned."** If you get an error, stop and send it to me.

To check it worked: **Table Editor** should list `places`, `clusters`, `matches`, `place_counts`, `network_applications`, and others.

## Part 3: Connection strings

1. At the top of the Supabase dashboard, click **Connect**.
2. Under **Connection String**, choose the **URI** type, then:
   - **Transaction pooler** (port **6543**): copy it. This one is **for Vercel**.
   - **Session pooler** (port **5432**, same `pooler.supabase.com` host): copy it. This one is **for GitHub Actions**.
   - Don't use **Direct connection**. GitHub's runners can't reach it without a paid IPv4 add-on.
3. In both strings, replace `[YOUR-PASSWORD]` with the password from Part 1.
   - If the password has symbols, URL-encode them: `@` → `%40`, `#` → `%23`, `/` → `%2F`, `:` → `%3A`, `?` → `%3F`.
   - Or reset it to letters and numbers only: **Project Settings → Database → Reset database password**.

The Vercel value should look like:
`postgresql://postgres.abcdefghijkl:YourPassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

## Part 4: Vercel environment variables

1. Go to **vercel.com** → your **something-clicks** project → **Settings** → **Environment Variables**.
2. For each row below:
   - click **Add Environment Variable** (or **Add New**)
   - enter the **Key** and **Value**
   - tick the environments shown, then click **Save**

| Key | Value | Production | Preview |
|---|---|---|---|
| `SUPABASE_DB_URL` | the **Transaction pooler** string (port 6543) | ✓ | ✓ |
| `SUPABASE_URL` | Project URL from Part 1 | ✓ | ✓ |
| `SUPABASE_ANON_KEY` | publishable / anon key | ✓ | ✓ |
| `SUPABASE_SERVICE_ROLE_KEY` | secret / service_role key, marked **Sensitive** | ✓ | ✓ |
| `SITE_URL` | `https://somethingclicks.com` | ✓ | |
| `ADMIN_EMAIL` | your email | ✓ | ✓ |
| `ADMIN_SESSION_SECRET` | 48 random characters ([1Password generator](https://1password.com/password-generator) or `openssl rand -base64 48`) | ✓ | ✓ |
| `RATE_LIMIT_SALT` | another long random string | ✓ | ✓ |

The Resend variables (`RESEND_API_KEY`, `NOTIFY_EMAIL_TO`, `NOTIFY_EMAIL_FROM`) are covered in the main README. Member sign-in links are emailed through Resend too, so **members can't sign in until `RESEND_API_KEY` and `NOTIFY_EMAIL_FROM` are set** (or `AUTH_EMAIL_FROM`, to send them from a different address). Member sessions are signed with `ADMIN_SESSION_SECRET`, under a separate key.

`MAILING_ADDRESS` and `INVITE_EMAIL_FROM` are for invitations, which nothing sends yet. Leave them unset until phase 3.

3. Variables only apply to new deployments. Go to **Deployments**, click **⋯** on the latest Production deployment → **Redeploy** → **Redeploy**.

## Part 5: GitHub Actions secret

1. On GitHub, open **Something-Clicks/something-clicks** → **Settings** (top tab) → **Secrets and variables** (left sidebar) → **Actions**.
2. Click **New repository secret**.
3. **Name:** `SUPABASE_DB_URL`
   **Secret:** the **Session pooler** string (port 5432)
4. Click **Add secret**.

## Part 6: Load the data

All of these run from GitHub: **Actions** tab → **Overture import** (left list) → **Run workflow** (right side). Leave **Branch: main**, fill the fields, and click the green **Run workflow** button. When a run finishes, open it and read the summary. **Always run a dry run first and check the numbers before loading.**

| Order | job | cluster | mode | What it does |
|---|---|---|---|---|
| 0 | `migrate` | (ignored) | `dry-run`, then `load` | Applies any missing database migrations (seconds) |
| 1 | `national` | (ignored) | `dry-run`, then `load` | ZIP-by-category counts and the location lookup, so search works everywhere (~33 MB, ~15 min) |
| 2 | `import` | `us-weddings` | `dry-run`, then `load` | Wedding-specific businesses across the US (~15 min) |
| 3 | `import` | `dfw-weddings` | `dry-run`, then `load` | Adds the metro's broad categories (salons, bakeries…) for later AI review |
| 4 | `matches` | `dfw-weddings` | (ignored) | Generates the metro's matches (wedding-specific only) |
| 5 | repeat steps 3–4 for `atl-weddings`, `hou-weddings`, `phx-weddings`, `bna-weddings` | | | Atlanta, Houston, Phoenix, Nashville |

Check the **Projected total** line in each dry run before loading.

A load that would take the database past 400 MB is refused automatically. After step 4, the admin shows the clusters at **somethingclicks.com/admin/network**.

## Part 7: Admin sign-in (if not done yet)

In Supabase:

1. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up".
2. **Authentication → Users → Add user → Create new user:** enter your `ADMIN_EMAIL`, tick **Auto Confirm User**, and click **Create user**.
3. **Authentication → URL Configuration:**
   - **Site URL:** `https://somethingclicks.com`
   - **Redirect URLs:** add `https://somethingclicks.com/admin/auth/callback`

Then go to **somethingclicks.com/admin**, enter your email, and click the link that arrives.
