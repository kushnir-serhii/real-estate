# 003 — Plektan sync

**Status:** draft · **Depends on:** 002 · **Route(s):** `/api/cron/sync`

## Goal
Properties from the agency's Plektan account appear on the site within the sync interval, with photos in R2, coordinates and parsed prices; vanished ones get hidden.

## Scope
- In: Plektan client + fixtures, mapping, full and incremental sync, hide vanished, photos to R2, geocoding, cron, agents.
- Out: leads to Plektan (006), admin editing (008).

## Data
`properties`, `property_photos`, `settings.last_sync_at / sync_cursor`. Reference: [../reference/plektan-api.md](../reference/plektan-api.md).

## Slices

### [ ] 1. Plektan client
- **Build:** `src/lib/plektan/` — `search` (pagination ≤20), `view`, `getContactPersons`, `getDistricts`; `x-auth-token`, `version=1.1`, `lang=uk`; zod schemas; timeout + retry; fixture mode with recorded responses.
- **Agent:** backend
- **Accept:**
  - [ ] runs fully on fixtures without a key

### [ ] 2. Mapping
- **Build:** Plektan item → `properties` row: price text parsing (HTML entities like `&asymp;`, spaces, currency), enums, slug generation, skip `is_mls`. Unit-testable pure functions.
- **Agent:** backend
- **Accept:**
  - [ ] tests (or a script) cover price formats found in fixtures

### [ ] 3. Sync job
- **Build:** full sync (all pages) and incremental (`after_date`); upsert by `external_id`; hide properties missing from a full sync; only runs when `settings.properties_source = 'plektan'`; `revalidateTag` after changes; cron endpoint protected by `CRON_SECRET`.
- **Agent:** backend
- **Accept:**
  - [ ] a property removed from fixtures becomes `hidden` after a full sync
  - [ ] second run with no changes writes nothing

### [ ] 4. Photos to R2
- **Build:** download each new photo, convert to WebP in 2–3 sizes, upload to R2, store keys; skip unchanged.
- **Agent:** backend
- **Accept:**
  - [ ] re-sync doesn't re-upload existing photos

### [ ] 5. Geocoding
- **Build:** `src/lib/geocode/` — address (locality, district, street, `housestr`) → lat/lng, cached on the row, only when the address changed.
- **Agent:** backend
- **Accept:**
  - [ ] fixture mode; failures leave `lat/lng` empty, sync continues

## External needs
- Plektan API key (from the agency) and a test account.
- R2 bucket + keys on the client's Cloudflare.

## Open questions
- Does `search` return only the agency's own base? (stack.md → Відкриті питання.)
- Where does the sync run: Cloudflare cron trigger (Workers limits, no `sharp`) or GitHub Actions in Node (easy WebP)? (Recommended: GitHub Actions calling a Node script, or the Worker for data + Actions for photos.)
- Sync interval? (Recommended: incremental every 15 min, full nightly.)
- Geocoder: Google, Visicom (UA), Nominatim? Cost vs quality for Ukrainian addresses.
- Show exact location or approximate (privacy)? (Recommended: approximate circle.)

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
