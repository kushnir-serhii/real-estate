# 021 — Premium home: blue palette, Playfair headings, sharp shapes, price histogram, motion

**Status:** ready · **Depends on:** 018 · **Route(s):** `/` (redesigned); `/catalog` (price filter); every other route only inherits the new tokens (fix regressions, no redesign); `/admin` gets one checkbox

## Goal
The home page reads as a **premium** agency that still serves every segment: a calm monochrome blue palette with no orange, Playfair Display headings that match the classic logo, sharp corners, lighter photos, an «Ексклюзивні об'єкти» showcase managed from the admin, a modern price filter whose histogram shows how many properties are in and around the chosen range (home and catalog), and editorial motion (a line-by-line mask reveal in the hero, not a plain fade).

Source: design critique of 2026-11-15 (the orange accent was too loud and everywhere, the condensed heading face fought the logo, rounded pills read as a startup app, navy veils muddied the photos, the home showed internal CRM features to buyers). Decisions below were made by the user in that session.

## Scope
- In:
  - **Palette, monochrome blue** (light and dark themes): midnight base, one brighter royal blue accent for details, no orange anywhere. Lighter photo veils.
  - **Type:** Playfair Display (regular case, not SC) for H1 / H2; Sofia Sans stays for body, UI, H3, card titles, prices.
  - **Shapes:** cards, media, sections 0px; buttons, inputs, selects, chips, tabs 2px.
  - **Home content:** hero simplified around the search; «Ексклюзивні об'єкти» first; «Нові пропозиції» below with deal tabs; «Зручно на кожному кроці» (CRM / Telegram block) removed; the two bottom CTAs merged into one; the «Про агентство» collage made clean. **Both district sections stay** (the user picks one later); they get the new palette, shapes and lighter veils.
  - **Exclusive flag:** `is_exclusive` on properties, a checkbox in the admin, a badge on the card; the home section falls back to the most expensive sale properties when fewer than 6 are flagged.
  - **Price range filter with histogram**, one component in the home quick search and in the catalog filters.
  - **Motion:** hero mask reveal, scroll reveals for photos and headings, card hover, page transitions, animated count in the price filter.
- Out:
  - Redesign of inner pages and the admin (they only inherit tokens; fix what breaks). A follow-up spec does the inner pages.
  - Choosing between the two district sections (the user decides later).
  - Real photos (placeholders stay).
  - Heavy effects: smooth-scroll hijacking (Lenis), custom cursor, magnetic buttons, GSAP.

## Design direction (decided 2026-11-15)

**Palette.** One accent family: blue. Starting values (final ones picked by eye in slice 1 and written in the log; every text pair checked for AA):

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--background` | cool ivory ≈ `#F7F6F2` (less yellow than today) | midnight ≈ `#0F1A2E` | page |
| `--card` | white | lifted midnight | cards, panels, with a hairline `--border` |
| `--foreground` / `--primary` | midnight ≈ `#13213A` | ivory | text; **the main button is midnight** on light, ivory on dark |
| `--brand` (new, replaces `--dawn`) | royal blue ≈ `#2F5BD3` | light blue ≈ `#8FB0FF` | details only: thin rules, eyebrows, numbers, icons, active histogram bars, slider range, focus ring, links on hover. Target ≤ 5% of a screen |
| `--brand-text` (replaces `--dawn-text`) | AA on page and cards | AA on page and cards | small accent text |
| veils | bottom gradient only, top of the photo clear | same | photos must look bright; hero text stays ≥ 4.5:1 on its gradient part |

`--dawn`, `--dawn-foreground`, `--dawn-text` and the `dawn` button variant are removed; their uses move to `primary` (filled) or `brand` (details). `--sky` is folded into `--brand` if it no longer has its own job.

**Type.**

| Role | Font | Use |
| --- | --- | --- |
| `--font-display` (new) | Playfair Display, variable, latin + cyrillic, self-hosted like today (`unicode-range` split, no Google request) | H1, H2, hero, section titles, the big CTA title |
| `--font-sans` | Sofia Sans (as today) | body, UI, forms, H3, card titles, **prices and numbers** (`tabular-nums`) |
| `--font-logo` | Cormorant SC (as today) | logo only |

Sofia Sans Extra Condensed is removed if nothing uses it after this (check the admin and the price sign). Playfair is a high-contrast serif: H1 / H2 at medium weight (500–600), never all caps, generous line height (≈ 1.1 for display, 1.15 for H2), sizes re-tuned (hero ≈ 64–80px desktop, ≈ 40–44px at 375px). Eyebrows: Sofia Sans, small caps or uppercase with tracking, `brand-text`, ≥ 13px.

**Shapes.** `--radius: 0` (cards, media, tiles, panels, dialogs, popovers), `--radius-control: 2px` (buttons of every size incl. icon buttons, inputs, selects, chips, badges, tabs, pagination, chat input, textarea). Only true dots stay round (status dot, slider thumbs, avatars). The favourite and photo-slider buttons on cards become 2px squares like the rest.

**Hero.** Photo full-bleed and bright (gradient only behind the text). Content: optional eyebrow, the H1, one line of lead, and the **quick search as the main action** (inside or overlapping the hero). No second CTA pair in the hero; the header keeps one «Залишити заявку» as an outlined / quiet button.

**Motion** (**no new library**: CSS, the browser's View Transitions and a few lines of our own code for the count tween; added first-load JS ≈ 0; everything off under `prefers-reduced-motion`; no animation may hide the LCP element or delay it):
- Hero: each line of the H1 rises from under an invisible mask line (clip, not opacity), staggered; the photo opens with a curtain (clip-path) and settles from a slight scale; the search panel follows. Lines are split on the server or with CSS, so the text is in the HTML and readable without JS.
- Scroll: section photos open with a clip-path curtain; H2 lines mask-reveal like the hero; cards stagger in (the existing `reveal` utilities, upgraded).
- Hover: card photo slow zoom, button fill transitions, district tiles.
- Page transitions: View Transitions API between catalog / home cards and the property page (the card photo morphs into the gallery), with a no-op fallback.
- Price filter: the result count tweens; bars change height smoothly.

## Price range filter (home + catalog)

Reference: the user's screenshot (histogram over a dual-thumb slider, min / max fields under it, «No max»).

- **Histogram:** ≈ 24–30 bars of property counts across the price range of the current context (deal type, and in the catalog every other active filter except price). Bars inside the selected range are `brand`; outside are muted. The last bar is open-ended («1.5M+»-style, bound at ≈ the 95th percentile) so one villa doesn't flatten the chart. Per deal type (sale / long rent / daily), never mixed.
- **Slider:** two thumbs, keyboard accessible (arrows, Page Up / Down, Home / End), `aria-valuetext` in the chosen currency, 44px touch targets.
- **Fields:** «Від» / «До» number inputs synced with the thumbs; «Без максимуму» link clears the top; currency select (UAH / USD / EUR) converts bins and fields with the existing exchange rates.
- **Count:** «Показати 124 об'єкти» on the submit button, updated live; the median of the context in the caption («медіана 85 000 $»).
- **Home:** the «Бюджет» field of the quick search opens a panel (popover on desktop, sheet on mobile) with the filter; changing the deal tab reloads the histogram.
- **Catalog:** replaces the price inputs in the filters form / sheet.
- **Loaded on open:** the histogram panel (slider, chart, fetch) is a lazily imported client chunk, loaded when the visitor opens «Бюджет» (home) or the price filter (catalog; on desktop it may load on idle after the page is interactive, with a skeleton until then). First-load JS of `/` and `/catalog` must not grow by more than ~2 KB gz. The slider uses Radix Slider from the installed `radix-ui` package (no new dependency).
- **No JS:** the form still has plain `price_from` / `price_to` / `currency` inputs, so it submits without JS (as today); the histogram and slider are progressive enhancement.

## Data
- Migration: `properties.is_exclusive boolean not null default false` (+ partial index on published exclusive rows if useful). Regenerate types. Plektan sync never writes or resets this column (admin-only field; covered by a test). Demo seed: flag ≈ 4–6 expensive sale properties; regenerate `supabase/seed.sql` (`pnpm seed:sql`).
- `src/lib/db/`: `getExclusiveProperties(limit)` (flagged first, newest; topped up with the most expensive published sale properties) and `getPriceHistogram(filters)` → `{ bins: { from_usd, to_usd, count }[], total, median_usd, max_usd }`, both drivers, driver contract tests. The histogram reads only `price_usd` for the matching published rows and bins on the server (enough for an agency-sized catalog; an SQL function is a later optimisation, noted in the log).
- Route handler `GET /api/price-histogram?<catalog params>` for the client to refetch when the deal / type / currency change; cached (same revalidate as the catalog), validated with the catalog params schema.
- Admin property form: «Ексклюзив» checkbox; admin properties list shows the flag.
- RLS unchanged (public reads published rows; the flag is just a column).

## Slices

### [ ] 1. Blue palette and lighter veils
- **Build:** new light / dark tokens per **Design direction**; `--brand` / `--brand-text` replace `--dawn*`; remove the `dawn` button variant and move every use to `default` (midnight) or `brand` details; lighter hero / district / CTA veils; card = white + hairline. `/design` shows the palette with contrast numbers.
- **Files:** `src/app/globals.css`, `src/components/ui/button.tsx`, every `dawn` use (`grep -rn dawn src`), `src/app/design/page.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] `grep -rn dawn src` finds nothing; no orange on any public page or the admin, both themes
  - [ ] all text pairs AA (body 4.5:1, large and UI 3:1), numbers in the log
  - [ ] hero text ≥ 4.5:1 over a white test photo
  - [ ] typecheck, lint, build green

### [ ] 2. Playfair Display headings
- **Build:** self-host Playfair Display (variable, latin + cyrillic, `unicode-range`), `--font-display`; H1 / H2 / display utilities use it with the re-tuned scale; H3, card titles, prices stay Sofia Sans; remove Sofia Sans Extra Condensed if unused (and its files, OFL entry); `/design` updated.
- **Files:** `src/app/fonts/*`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/design/page.tsx`, components using `font-heading`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] «Нерухомість у Києві», «Ґ, Є, Ї, І» render in Playfair (no fallback glyphs)
  - [ ] fonts from local files only; font bytes before / after in the log
  - [ ] `pnpm perf` on `/`: LCP < 2.5 s, CLS < 0.1

### [ ] 3. Sharp shapes
- **Build:** `--radius: 0`, `--radius-control: 2px`; check every component that hardcodes `rounded-full` / `rounded-2xl` / `rounded-3xl` (cards, tiles, collage, chips, favourite and slider buttons, chat launcher, popovers, sheets); dots, thumbs and avatars stay round.
- **Files:** `src/app/globals.css`, `src/components/**`, `src/features/**`
- **Agent:** designer · **Model:** sonnet (grep-and-replace part: haiku)
- **Accept:**
  - [ ] public pages and admin: no pill or large radius left except the documented round exceptions, both themes
  - [ ] focus rings follow the new shape; 44px targets at 375px

### [ ] 4. Exclusive flag (data + admin)
- **Build:** migration + types, demo seed + `seed.sql`, `getExclusiveProperties` with the fallback (both drivers + contract test), sync leaves the flag alone (test), admin checkbox + list column, «Ексклюзив» badge on the property card.
- **Files:** `supabase/migrations/*_property_exclusive.sql`, `src/lib/database.types.ts`, `src/lib/db/*`, `src/lib/demo/seed/*`, `supabase/seed.sql`, `src/features/admin/**` (property form), `src/features/properties/property-card.tsx`, `src/lib/plektan/**` sync mapping
- **Agent:** backend (UI bits: designer) · **Model:** sonnet
- **Accept:**
  - [ ] with 0 flagged the home still shows 6 (most expensive sale); with 2 flagged they come first
  - [ ] a sync run does not change `is_exclusive`
  - [ ] `pnpm test` green incl. seed drift test; Supabase contract run green when a local DB is up

### [ ] 5. Home layout and content
- **Build:** hero per **Design direction** (search as the main action, no CTA pair); «Ексклюзивні об'єкти» first (eyebrow «Колекція», title «Ексклюзивні об'єкти», lead «Вибрані квартири та будинки, які ми рекомендуємо»; 6 cards, larger, editorial); «Нові пропозиції» below with deal tabs (Купити / Оренда / Подобово, **3 cards each** + «Усі об'єкти →» to the catalog with that deal; radio + CSS so it works without JS and the page stays static); remove «Зручно на кожному кроці» (and its constants / component if unused elsewhere); merge the two bottom CTAs into one block with the lead form; clean «Про агентство» (no frames, no rounded collage); both district sections restyled, kept.
- **Files:** `src/app/(site)/page.tsx`, `src/features/home/*`, `src/constants/home.ts`, `src/components/layout/*` (header CTA, footer CTA band)
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] first viewport at 1440 and 375: one filled button at most, the H1 and the search are what draws the eye
  - [ ] no mention of CRM, Plektan or Telegram notifications on the home
  - [ ] one CTA block above the footer
  - [ ] page works without JS (search submits, tabs switch or degrade to links)

### [ ] 6. Price histogram data
- **Build:** `getPriceHistogram` (both drivers, contract tests: empty, one price, skewed prices with the open-ended last bin, per deal), `GET /api/price-histogram` validated with the catalog params schema, cached.
- **Files:** `src/lib/db/*`, `src/app/api/price-histogram/route.ts`, `src/features/catalog/catalog-params.ts`
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [ ] counts per bin add up to `total`; the selected range count equals the catalog's result count for the same filters
  - [ ] invalid params → 400; no unpublished rows counted

### [ ] 7. Price range filter component
- **Build:** histogram + dual-thumb slider + fields + currency + live count per **Price range filter**; in the home quick search (popover / mobile sheet from «Бюджет») and in the catalog filters (form and mobile sheet); no-JS fallback keeps plain inputs.
- **Files:** `src/components/price-range/*` (or `src/features/catalog/price-range-*`), `src/features/home/quick-search.tsx`, `src/features/catalog/catalog-filters-form.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] dragging or typing updates bars, fields and «Показати N об'єктів»; switching deal or currency reloads / converts
  - [ ] keyboard only: both thumbs operable, values announced in the chosen currency
  - [ ] without JS the home and catalog forms still filter by price

### [ ] 8. Motion
- **Build:** per **Design direction → Motion**: hero line mask reveal + photo curtain, scroll reveals for photos and H2, card hover zoom, View Transitions card → property page, count tween. No new library (decided); if a piece can't be done without one, drop it and note it in the log.
- **Files:** `src/app/globals.css`, `src/features/home/hero.tsx`, `src/components/section-heading.tsx`, `src/features/properties/property-card.tsx`, property gallery, `next.config.ts` (view transitions flag if needed)
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] `prefers-reduced-motion: reduce` shows everything at once, no movement
  - [ ] hero H1 text is in the server HTML and readable without JS
  - [ ] `pnpm perf` on `/`: LCP < 2.5 s, CLS < 0.1, first-load JS not grown by more than ~2 KB gz (before / after in the log)

### [ ] 9. Regression pass and UI check
- **Build:** walk every public route and the admin in both themes at 375 / 1280 / 1440 for breakage from the tokens (colours, fonts, radii); fix only regressions; update `docs/product.md` design principles and `docs/conventions.md` (palette, fonts, radii, motion rules); `pnpm ui-check`.
- **Files:** as needed, `docs/product.md`, `docs/conventions.md`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] `pnpm ui-check` passes; typecheck, lint, test, build green
  - [ ] docs describe the new palette, fonts, radii and motion rules

## External needs
- Apply the `is_exclusive` migration to the Supabase project (user).
- Real photos for hero, districts and about (later; placeholders now).

## Open questions
- **Decided (2026-11-15, user):** motion without any new library; the histogram panel is loaded on open (no first-load growth); copy «Колекція / Ексклюзивні об'єкти / Вибрані квартири та будинки, які ми рекомендуємо», card badge «Ексклюзив», admin checkbox «Ексклюзив (показувати в колекції на головній)»; «Нові пропозиції» tabs show 3 cards each.
- Which district section stays (picker or bento): the user decides after seeing both in the new style.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-15 | — | drafted | from the design critique; decisions: monochrome blue, Playfair Display (not SC) for H1/H2, 0px cards / 2px controls, CRM block removed, both district sections kept, exclusive = admin flag + price fallback, «Нові пропозиції» kept with deal tabs, histogram on home + catalog, motion «expressive but light» with a line-mask hero |
