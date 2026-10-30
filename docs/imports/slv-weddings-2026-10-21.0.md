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
