# Dry run: Salt Lake Valley weddings (`slv-weddings`)

**Overture release:** 2026-10-21.0 (found through the S3 listing; the STAC catalog didn't respond from the build environment)
**Date:** 2026-10-30
**Command:** `python -m sc_overture import slv-weddings --dry-run`
**Status:** dry run only. **Not loaded into the production database.** That needs Matt's approval and the `SUPABASE_DB_URL` secret.

## Settings

- Bounding box: −112.20, 40.40 → −111.70, 40.85 (Salt Lake Valley; the southern edge clips north Lehi)
- Confidence ≥ 0.6, closed records dropped, unknown operating status kept
- Weddings journey: 17 categories over 35 Overture taxonomy values, plus name rules

## Result

| | Rows |
|---|---|
| Read from Overture | 71,243 |
| **Kept** | **2,429** |
| Dropped: not a wedding category | 53,722 |
| Dropped: confidence below 0.6 | 11,999 |
| Dropped: permanently or temporarily closed | 3,063 |
| Dropped: duplicate (same name within 50 m, or same domain and phone within 200 m) | 17 |
| Dropped: junk name | 11 |
| Dropped: non-US address | 2 |
| Dropped: suppressed | 0 |

**Classified by:** taxonomy 2,281 · name rule 148 (mostly photographers filed as `professional_service`)

| Category | Kept | | Category | Kept |
|---|---|---|---|---|
| Hair and beauty salons (*broad*) | 974 | | Florists | 64 |
| Bakeries and dessert shops (*broad*) | 285 | | Event rental companies | 57 |
| Wedding and event planners | 196 | | Bridal and formal wear | 51 |
| Photographers | 173 | | DJs and musicians | 27 |
| Jewelers (*broad*) | 154 | | Limo and party bus services | 27 |
| Flower and gift shops (*broad*) | 127 | | Videographers | 13 |
| Hair and makeup artists | 124 | | Cake makers | 7 |
| Caterers | 78 | | Stationery shops | 6 |
| Event and wedding venues | 66 | | | |

- 1,164 of the 2,429 have an email address on file (used only for approved invitations).
- **Wedding-specific:** 889. **Broad categories:** 1,540. Broad-category businesses score at 0.6× until enrichment or the owner confirms wedding services.

## Size

| | |
|---|---|
| Projected addition | 6.4 MB (places plus room for about 15 matches each) |
| Measured after a local load | places 2.8 MB, matches 7.7 MB (36,435 matches) |
| Free-tier budget | 400 MB of 500 MB, comfortably within |

## Known data-quality issues for review

- Some Overture categories are wrong. Examples: "All Media Restoration" (photo restoration) filed as a photography service, and "Realtypath" filed as an event venue. Phase 3 enrichment and the admin "hide" action handle these.
- Restaurants that cater ("Q4U Barbeque Restaurant and Catering") count as caterers through the name rule.
- Home-based vendors (photographers, DJs, makeup artists, cake makers) are under-represented. **Add your business** (phase 2) covers them.

## National tables (run 2026-10-30, local dev database)

`python -m sc_overture national --load` scanned all 18,445,270 US places in about 13 minutes.

| | Rows | Size with indexes |
|---|---|---|
| `place_counts`: wedding categories per ZIP code (no names) | 144,856 (685,545 places counted) | 15 MB |
| `geo_lookup`: ZIP-code and city centers | 65,196 (36,371 ZIPs, 28,825 cities) | 18 MB |

**National wedding-category places:** salons 302,298 · planners 61,446 · bakeries 56,394 · flower and gift shops 54,930 · photographers 44,439 · jewelers 43,391 · hair and makeup 25,883 · caterers 20,862 · florists 17,054 · venues 14,759 · event rentals 13,178 · bridal and formal wear 10,318 · DJs and musicians 7,236 · limos 6,999 · cake makers 3,427 · stationery 1,489 · videographers 1,442.

The local dev database holds both tables, the test cluster and its matches, and the earlier v1 tables, for a total of **83 MB** (free tier: 500 MB).
