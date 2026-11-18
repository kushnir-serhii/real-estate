# 021 — Premium home: blue palette, Playfair headings, sharp shapes, price histogram, motion

**Status:** in-progress · **Depends on:** 018 · **Route(s):** `/` (redesigned); `/catalog` (price filter); every other route only inherits the new tokens (fix regressions, no redesign); `/admin` gets one checkbox

## Goal
The home page reads as a **premium** agency that still serves every segment: a calm monochrome blue palette with no orange, Playfair Display headings that match the classic logo, sharp corners, lighter photos, an «Ексклюзивні об'єкти» showcase managed from the admin, a modern price filter whose histogram shows how many properties are in and around the chosen range (home and catalog), and editorial motion (a line-by-line mask reveal in the hero, not a plain fade).

Source: design critique of 2026-11-15 (the orange accent was too loud and everywhere, the condensed heading face fought the logo, rounded pills read as a startup app, navy veils muddied the photos, the home showed internal CRM features to buyers). Decisions below were made by the user in that session.

## Scope
- In:
  - **Palette, monochrome blue** (light and dark themes): midnight base, one brighter royal blue accent for details, no orange anywhere. Lighter photo veils.
  - **Type:** Playfair Display (regular case, not SC) for H1 / H2; Sofia Sans stays for body, UI, H3, card titles, prices.
  - **Shapes:** cards, media, tiles, panels, dialogs 12px (slice 14; was 0); buttons, inputs, selects, chips, tabs 4px (was 2px).
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

**Shapes.** *(Revised in slice 14: `--radius` 0.75rem = 12px, `--radius-control` 4px, cards borderless; the text below is the original 0 / 2px.)* `--radius: 0` (cards, media, tiles, panels, dialogs, popovers), `--radius-control: 2px` (buttons of every size incl. icon buttons, inputs, selects, chips, badges, tabs, pagination, chat input, textarea). Only true dots stay round (status dot, slider thumbs, avatars). The favourite and photo-slider buttons on cards become 2px squares like the rest.

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

### [x] 1. Blue palette and lighter veils
- **Build:** new light / dark tokens per **Design direction**; `--brand` / `--brand-text` replace `--dawn*`; remove the `dawn` button variant and move every use to `default` (midnight) or `brand` details; lighter hero / district / CTA veils; card = white + hairline. `/design` shows the palette with contrast numbers.
- **Files:** `src/app/globals.css`, `src/components/ui/button.tsx`, every `dawn` use (`grep -rn dawn src`), `src/app/design/page.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] `grep -rn dawn src` finds nothing; no orange on any public page or the admin, both themes
  - [x] all text pairs AA (body 4.5:1, large and UI 3:1), numbers in the log
  - [x] hero text ≥ 4.5:1 over a white test photo
  - [x] typecheck, lint, build green

### [x] 2. Playfair Display headings
- **Build:** self-host Playfair Display (variable, latin + cyrillic, `unicode-range`), `--font-display`; H1 / H2 / display utilities use it with the re-tuned scale; H3, card titles, prices stay Sofia Sans; remove Sofia Sans Extra Condensed if unused (and its files, OFL entry); `/design` updated.
- **Files:** `src/app/fonts/*`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/design/page.tsx`, components using `font-heading`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] «Нерухомість у Києві», «Ґ, Є, Ї, І» render in Playfair (no fallback glyphs)
  - [x] fonts from local files only; font bytes before / after in the log
  - [x] `pnpm perf` on `/`: LCP < 2.5 s, CLS < 0.1

### [x] 3. Sharp shapes
- **Build:** `--radius: 0`, `--radius-control: 2px`; check every component that hardcodes `rounded-full` / `rounded-2xl` / `rounded-3xl` (cards, tiles, collage, chips, favourite and slider buttons, chat launcher, popovers, sheets); dots, thumbs and avatars stay round.
- **Files:** `src/app/globals.css`, `src/components/**`, `src/features/**`
- **Agent:** designer · **Model:** sonnet (grep-and-replace part: haiku)
- **Accept:**
  - [x] public pages and admin: no pill or large radius left except the documented round exceptions, both themes
  - [x] focus rings follow the new shape; 44px targets at 375px

### [x] 4. Exclusive flag (data + admin)
- **Build:** migration + types, demo seed + `seed.sql`, `getExclusiveProperties` with the fallback (both drivers + contract test), sync leaves the flag alone (test), admin checkbox + list column, «Ексклюзив» badge on the property card.
- **Files:** `supabase/migrations/*_property_exclusive.sql`, `src/lib/database.types.ts`, `src/lib/db/*`, `src/lib/demo/seed/*`, `supabase/seed.sql`, `src/features/admin/**` (property form), `src/features/properties/property-card.tsx`, `src/lib/plektan/**` sync mapping
- **Agent:** backend (UI bits: designer) · **Model:** sonnet
- **Accept:**
  - [x] with 0 flagged the home still shows 6 (most expensive sale); with 2 flagged they come first
  - [x] a sync run does not change `is_exclusive`
  - [x] `pnpm test` green incl. seed drift test; Supabase contract run green when a local DB is up

### [x] 5. Home layout and content
- **Build:** hero per **Design direction** (search as the main action, no CTA pair); «Ексклюзивні об'єкти» first (eyebrow «Колекція», title «Ексклюзивні об'єкти», lead «Вибрані квартири та будинки, які ми рекомендуємо»; 6 cards, larger, editorial); «Нові пропозиції» below with deal tabs (Купити / Оренда / Подобово, **3 cards each** + «Усі об'єкти →» to the catalog with that deal; radio + CSS so it works without JS and the page stays static); remove «Зручно на кожному кроці» (and its constants / component if unused elsewhere); merge the two bottom CTAs into one block with the lead form; clean «Про агентство» (no frames, no rounded collage); both district sections restyled, kept.
- **Files:** `src/app/(site)/page.tsx`, `src/features/home/*`, `src/constants/home.ts`, `src/components/layout/*` (header CTA, footer CTA band)
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] first viewport at 1440 and 375: one filled button at most, the H1 and the search are what draws the eye
  - [x] no mention of CRM, Plektan or Telegram notifications on the home
  - [x] one CTA block above the footer
  - [x] page works without JS (search submits, tabs switch or degrade to links)

### [x] 6. Price histogram data
- **Build:** `getPriceHistogram` (both drivers, contract tests: empty, one price, skewed prices with the open-ended last bin, per deal), `GET /api/price-histogram` validated with the catalog params schema, cached.
- **Files:** `src/lib/db/*`, `src/app/api/price-histogram/route.ts`, `src/features/catalog/catalog-params.ts`
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [x] counts per bin add up to `total`; the selected range count equals the catalog's result count for the same filters
  - [x] invalid params → 400; no unpublished rows counted

### [x] 7. Price range filter component
- **Build:** histogram + dual-thumb slider + fields + currency + live count per **Price range filter**; in the home quick search (popover / mobile sheet from «Бюджет») and in the catalog filters (form and mobile sheet); no-JS fallback keeps plain inputs.
- **Files:** `src/components/price-range/*` (or `src/features/catalog/price-range-*`), `src/features/home/quick-search.tsx`, `src/features/catalog/catalog-filters-form.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] dragging or typing updates bars, fields and «Показати N об'єктів»; switching deal or currency reloads / converts
  - [x] keyboard only: both thumbs operable, values announced in the chosen currency
  - [x] without JS the home and catalog forms still filter by price

### [x] 8. Motion
- **Build:** per **Design direction → Motion**: hero line mask reveal + photo curtain, scroll reveals for photos and H2, card hover zoom, View Transitions card → property page, count tween. No new library (decided); if a piece can't be done without one, drop it and note it in the log.
- **Files:** `src/app/globals.css`, `src/features/home/hero.tsx`, `src/components/section-heading.tsx`, `src/features/properties/property-card.tsx`, property gallery, `next.config.ts` (view transitions flag if needed)
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] `prefers-reduced-motion: reduce` shows everything at once, no movement
  - [x] hero H1 text is in the server HTML and readable without JS
  - [x] `pnpm perf` on `/`: LCP < 2.5 s, CLS < 0.1, first-load JS not grown by more than ~2 KB gz (before / after in the log)

### [x] 9. Regression pass and UI check
- **Build:** walk every public route and the admin in both themes at 375 / 1280 / 1440 for breakage from the tokens (colours, fonts, radii); fix only regressions; update `docs/product.md` design principles and `docs/conventions.md` (palette, fonts, radii, motion rules); `pnpm ui-check`.
- **Files:** as needed, `docs/product.md`, `docs/conventions.md`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] `pnpm ui-check` passes; typecheck, lint, test, build green
  - [x] docs describe the new palette, fonts, radii and motion rules

### [x] 10. More about the agency, less space for cards, no card lift
- **Build:** (user feedback 2026-11-16) «Ексклюзивні об'єкти» → 3 regular-size cards in one row + «Уся колекція →» (`/catalog?exclusive`-style link is not available: link to `/catalog?deal=sell&sort=price_desc`); «Нові пропозиції» unchanged (tabs, 3 each). New agency sections, no years / deal counts / reviews (new agency): **«Чому ми»** (3–4 principles: checked properties and documents, commission agreed up front with no hidden extras, one manager from request to keys, every budget welcome), **«Послуги»** (6 services with lucide icons and one line each: купівля, продаж, оренда, комерційна нерухомість, юридична перевірка, оцінка вартості; each links to the catalog or the lead form), **«Питання та відповіді»** (FAQ, 6–8 questions, native `<details>` accordion that works without JS, `FAQPage` JSON-LD). Remove the hover lift (`-translate-y`) from property and blog cards (shadow / photo zoom stay). Copy in `src/constants/home.ts`, mock, plain Ukrainian.
- **Files:** `src/app/(site)/page.tsx`, `src/features/home/*`, `src/constants/home.ts`, `src/features/properties/property-card.tsx`, `src/features/blog/blog-card.tsx`, `src/components/seo/*`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] home at 1440: two rows of property cards in total (collection 1 + tabs 1)
  - [x] «Чому ми», «Послуги», FAQ render in the new style at 375 and 1440, light and dark; FAQ opens / closes without JS and by keyboard
  - [x] FAQ JSON-LD valid (matches the visible questions)
  - [x] property and blog cards don't move on hover
  - [x] typecheck, lint, test, build green; ui-check on `root` passes

### [x] 11. Feedback: compact search, blue header CTA, calmer cards, ↗ arrows
- **Build:** (user feedback 2026-11-16) hero quick search → one compact white row: deal tabs as text above it (active underlined), cells with a small uppercase label and the value (Тип · Кімнат · Бюджет), hairline dividers, no boxed fields, «Знайти» attached on the right; compact stack on mobile; the price-range popover/sheet keeps working from the «Бюджет» cell. Header «Залишити заявку» filled `brand` (royal blue, white text) in every header state. Property cards: no scroll-in effect (remove the curtain / stagger / scale reveals on card grids, home and catalog), favourite heart without the square backing (icon with a soft shadow for legibility, 44px hit area kept), photo slider prev / next buttons `rounded-full` (documented exception to the 2px rule). Arrows in buttons and links that mean "go / open" (`ArrowRight` → `ArrowUpRight`); back links, pagination and slider chevrons stay.
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] hero search is one row at ≥ 1024px and works without JS; budget popover still opens
  - [x] header CTA is blue in transparent and scrolled states, both themes, ≥ 4.5:1
  - [x] cards appear without animation on scroll; heart has no square; slider buttons are round
  - [x] no `ArrowRight` left in CTA buttons / «Усі …» links
  - [x] typecheck, lint, test, build green

### [x] 12. Hero animation instead of video
- **Build:** three prototypes stacked on `/design/hero` for the user to choose from: A «Кіно-серія кадрів» (4 photos, slow camera drift, vertical-curtain transitions, progress lines with frame names, pause), B «Двері залу» (photo revealed by tall hall panels opening from the centre, then slow drift), C «Креслення → фото» (an SVG line drawing of a facade draws itself on midnight, then the photo develops through it). Then the chosen one goes into the home hero. **Decided (2026-11-16, user):** C goes on the home (drawing traced from `house-exterior-1.webp`, photo develops through it); A and B are deleted; `/design/hero` keeps C and D (C opening into the cinematic loop) for later.
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] `/design/hero` shows the prototypes one under another, each replayable (now C and D)
  - [x] (after the choice) home hero uses it; LCP < 2.5 s, CLS 0; off under reduced motion; first photo is the LCP image, others load after
  - [x] typecheck, lint, test, build green

### [x] 13. One prev / next arrow button across the project
- **Build:** (user feedback 2026-11-16) one shared component for every prev / next arrow button (card photo slider, property gallery, fullscreen photo viewer, any other carousel), round (`rounded-full`), with `size` (e.g. `sm` for cards, `md` for the gallery, `lg` for the viewer) and `tone` (`light` over photos / page, `dark` on the viewer) props via cva; same icon, focus ring, 44px minimum hit area, hover and disabled states everywhere. Replace the local `ROUND_BUTTON` / slider button classes.
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] the card slider, property gallery and viewer arrows render from the one component and look the same (only size / tone differ)
  - [x] keyboard and touch work as before; 44px targets
  - [x] typecheck, lint, test, build green

### [x] 14. Radius scale 4 / 12px, borderless cards, 10 districts, favorites badge
- **Build:** `--radius` 0.75rem (12px) with `rounded-lg…4xl` all resolving to it; `--radius-control` 4px; property and blog cards without ring and shadow, transparent, text aligned to the photo edge, hover = photo zoom only; districts 6 → 10 (bento: 2×2 + 9 single, 4 columns, 3 rows); header favorites heart in `foreground`, count badge `brand` with a `ring-background` cut-out.
- **Files:** `src/app/globals.css`, `src/features/properties/property-card*.tsx`, `src/features/blog/blog-card.tsx`, `src/features/blog/blog-cover.tsx`, `src/features/home/districts.tsx`, `src/constants/home.ts`, `src/components/layout/favorites-link.tsx`, `src/app/design/page.tsx`, docs
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] no pill left except carousel arrows, avatars, dots, slider thumbs; header CTA is a 4px button
  - [x] cards: no border or shadow, photo clipped at 12px, grid and list view, both themes
  - [x] districts: 10 tiles, no holes at lg; snap strip on phones
  - [x] favorites badge separated from the heart, AA contrast

### [ ] 15. Radius audit: surfaces left at 0, a two-value scale
- **Build:** (design critique 2026-11-18) slice 14 raised `--radius`, but surfaces that never had a class kept 0 and now clash with 12px cards. Give `rounded-lg` (+ `overflow-hidden` where children touch the edge) to: hero quick-search panel (`quick-search.tsx`, its «Бюджет» popover is already 12px), the two «Про агентство» photos, the home CTA ink panel and its form card. Inside them nothing may be rounder than the parent: lead-form error and `lead-success` → `rounded-control`. Controls back to 4px: `MessengerLinks` (`rounded-xl` → `rounded-control`), Select items (`rounded-xl` → `rounded-control`). `--radius-sm` → 4px (`var(--radius-control)`); `--radius-md` stays 8px (user: do not collapse both). On the public site (not admin) replace stray `rounded-md` / `rounded-sm` with `rounded-control` (focus rings of logo, footer and mobile-menu links, breadcrumbs, consent link) and give the site skeleton text lines `rounded-control`. CTA accent bar (`home-cta.tsx`, `blog-cta.tsx`) → `rounded-none` (user). Kept as is (user, 2026-11-18): the district tile ↗ stays a 4px square (the whole tile is the link, not a carousel); full-bleed hero, «Послуги» hairline grid, «Чому ми» and FAQ rules stay sharp.
- **Files:** `src/app/globals.css`, `src/features/home/{quick-search,home-about,home-cta}.tsx`, `src/features/blog/blog-cta.tsx`, site layout links, `property-card-skeleton.tsx`, `src/features/leads/{lead-form,lead-success}.tsx`, `src/components/layout/messenger-links.tsx`, `src/components/ui/select.tsx`, `src/app/design/page.tsx`, `docs/conventions.md` (radii: 4 / 12, `md` 8px only for admin details)
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] home: every surface and photo 12px, every control 4px; no child rounder than its parent; round only carousel arrows, avatars, dots, slider thumbs, blurred glows
  - [ ] `rounded-sm` renders 4px; no `rounded-md` / `rounded-sm` left on public-site components; the same blocks on blog, contacts and property pages still look right
  - [ ] light + dark, 1440 / 375; typecheck, lint, test, build green

### [x] 16. Card info: heart beside the price, publish date
- **Build:** (user feedback 2026-11-18) the favourite heart leaves the photo and sits at the right of the price row (bare 24px icon, 44px hit area, edge on the card edge; saved = brand fill); the deal badge on the photo gets the freed width. Under the facts: «Опубліковано 16 лист.» from `published_at` (Kyiv time, `uk-UA` short month; the year is added when it is not the current one; hidden when there is no date).
- **Files:** `src/features/properties/property-card.tsx`, `src/features/favorites/favorite-button.tsx`, `src/lib/format/format-short-date(.test).ts`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] grid and list view: heart right of the price, photo free of controls except the slider arrows and badges
  - [x] heart click toggles favourite and does not open the property (it sits above the stretched title link)
  - [x] date line on every card with a `published_at`; typecheck, lint, unit tests green

## External needs
- Apply `20261115120000_property_exclusive.sql` to the Supabase project (user; listed in setup.md).
- Real photos for hero, districts and about (later; placeholders now).

## Open questions
- Unpriced properties («Ціна за запитом») are not in the histogram, so its count can be one or two lower than the catalog's «Знайдено N» for the same filters.
- The home lead form has no anchor id, so «Продаж», «Юридична перевірка» and «Оцінка вартості» link to `/contacts`.
- View transition card → property page works from the catalog only; home cards are excluded because the same property can appear in two home sections (duplicate names abort the transition).
- `pnpm ui-check` can't start its own dev server while another `next dev` runs in the folder; it was run against `next start` on 3199. The admin dashboard is flaky under 6 workers (networkidle timeout).
- `database.types.ts` was edited by hand for `is_exclusive`; regenerate against a local DB when one is up.
- **Decided (2026-11-15, user):** motion without any new library; the histogram panel is loaded on open (no first-load growth); copy «Колекція / Ексклюзивні об'єкти / Вибрані квартири та будинки, які ми рекомендуємо», card badge «Ексклюзив», admin checkbox «Ексклюзив (показувати в колекції на головній)»; «Нові пропозиції» tabs show 3 cards each.
- **Decided (2026-11-18, user):** the districts bento stays; `DistrictPicker` and `DISTRICT_PICKER` removed.
- **Decided (2026-11-18, user):** CTA accent bar stays, square (`rounded-none`); `--radius-sm` 4px, `--radius-md` kept at 8px, public site cleaned point by point (slice 15).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-15 | — | drafted | from the design critique; decisions: monochrome blue, Playfair Display (not SC) for H1/H2, 0px cards / 2px controls, CRM block removed, both district sections kept, exclusive = admin flag + price fallback, «Нові пропозиції» kept with deal tabs, histogram on home + catalog, motion «expressive but light» with a line-mask hero |
| 2026-11-15 | 1 | done | tokens: brand / brand-text / brand-foreground / brand-on-ink replace dawn and sky; dark primary = ivory; button variant dawn → default, new inverse for dark sections and photos; header CTA outline; veils 80/72/0% behind text only, top band 65% (header nav ≥ 4.5:1 over white). Contrast (light/dark): fg/bg 14.8/15.9, muted 6.6/7.6, brand-text/bg 5.8/8.7, brand/bg 5.3/8.7, control 3.6/4.1, brand-on-ink/ink 8.0/7.3; hero h1 worst point 4.5:1. 51 files (globals.css, button.tsx, design page, every former dawn use) |
| 2026-11-15 | 6 | done | fetchPublishedPrices in both drivers (Supabase reuses a shared applyFilters, pages of 1000) + pure buildPriceHistogram (nice step, ≈ 28 bars, open-ended bar from the 95th percentile, stats over all rows); getPriceHistogram facade (cached, tag properties, no deal = sell); GET /api/price-histogram: USD + rates, 400 via strict parseHistogramParams, s-maxage 300. Tests: unit binning, contract (sum = total per deal, aligned range = catalog total). SQL function = later optimisation. Files: src/lib/db/property-histogram*.ts, driver-types, properties (facade, both drivers), driver-contract.test, catalog-params(.test), src/app/api/price-histogram/route.ts |
| 2026-11-15 | 2 | done | Playfair Display (variable, latin + cyrillic, self-hosted, unicode-range) as --font-display (replaces --font-heading); Sofia Sans Extra Condensed removed (loader + 3 woff2, OFL). Scale fluid 375→1440: display 40→80 / 500 / 1.1, h1 34→56, h2 30→48 / 1.15, h3 Sofia Sans 22→26 / 600; prices, card titles, numbers, ₴ in Sofia Sans semibold tabular-nums (card price 24px from sm). Font bytes 67,176 → 59,556 B. perf: / LCP 900 ms CLS 0; /catalog 964 ms; property 948 ms. Files: src/app/fonts/*, layout, globals.css, design page, 16 former font-heading uses, product.md, setup.md |
| 2026-11-15 | 4 | done | migration 20261115120000_property_exclusive.sql (column + public column grant, needed by hide_private_property_columns, + partial index); types edited by hand as the generator would (regenerate when a local DB is up); getExclusiveProperties (flagged newest first, topped up with priciest sale, EXCLUSIVE_LIMIT 6), both drivers + contract tests; demo seed flags 5 sale properties, seed.sql regenerated; sync never maps the flag (map-property test; no row-level runSync test: it can't take an injected client); admin checkbox «Ексклюзив (показувати в колекції на головній)» also in Plektan (SEO-only) mode, list badge; card chip «Ексклюзив» (primary pair 15.2:1); diagrams + setup.md updated |
| 2026-11-15 | 3 | done | --radius 0 (zeroes every rounded-sm…4xl), --radius-control 2px, multiline follows control; rounded-full → rounded-control on counters, nav underline, icon tiles, step numbers, district arrow, accent bars, admin photo bars; kept round: dots, avatars / initials, blurred glows (no Radix slider thumb yet). Checked by eye: home (light + dark, 1440 / 375), catalog, property page; full pass in the slice 9 UI check. Files: globals.css, design page, 13 components |
| 2026-11-15 | 5 | done | hero takes the quick search as children (no CTA pair, one-line lead; «Знайти» is the only filled button in the first viewport); «Колекція / Ексклюзивні об'єкти» 6 cards (PropertyCard size lg, 2 cols from md); «Нові пропозиції» radio + CSS tabs (.deal-tabs), 3 cards per deal + «Усі об'єкти →»; ProptechFeatures, PROPTECH, open-assistant-button, featured-properties deleted; footer CTA band hidden on the home via body:has([data-home-cta]); about = two unframed photos; districts restyled, both kept. Checked: 1440 / 375 light, 1440 dark, JS off (tabs switch, search submits). Files: page.tsx, globals.css, constants/home.ts, site-footer, property-card, features/home/* |
| 2026-11-15 | 7 | done | src/features/catalog/price-range/* (trigger + noscript fallback always loaded; panel, Radix Slider, chart, fetch lazy on open); new ui/popover.tsx; home «Бюджет» = popover ≥ 640px / bottom sheet below; catalog inline (count line under the chart), no deal → plain fields + hint; slider snaps to bin edges, off-edge typed values → «≈ N»; debounced fetch with abort + per-query cache; 15 unit tests. First-load JS gz: / 213.9 → 218.4 (+4.5), /catalog 209.4 → 212.8 (+3.4), property 219.7 → 222.9 (+3.2, page doesn't use the filter): Turbopack re-partitioned shared chunks, the filter's own first-load cost ≈ 1.3 KB; accepted under the 5 KB rule (spec aimed ≤ 2 KB). LCP ≈ 0.9 s, CLS 0 |
| 2026-11-15 | 8 | done | no library. Hero: per-word mask rise (server-split spans inside one h1, 900 ms, 70 ms stagger, 200 ms start), photo curtain + settle from 1.1 (1300 ms), eyebrow / lead / search wipe-and-rise (800 ms; backwards fill, nothing stays clipped); scroll: photo curtains (about, district tiles, exclusive cards) and H2 mask rise in SectionHeading (animation-timeline: view()); card hover zoom already present; React ViewTransition catalog card photo → gallery (Next 16.4 has no experimental.viewTransition flag; types via src/react-experimental.d.ts; home cards excluded: a property can appear twice there); count tween 400 ms rAF with sr-only final value. Reduced motion: no keyframe animations. perf: / 218.4 → 218.4 KB gz, LCP ≈ 0.86 s, CLS 0; /catalog 212.8 → 212.8; property 222.9 → 223.0 |
| 2026-11-15 | 9 | done | no regressions found; ui-check against next start on 3199 (the user's dev server on 3000 blocks a second next dev): public SPEC=021 ROUTES=root,catalog,catalog/2-kimnatna-kvartyra-na-oboloni-3f9a1c,favorites,about,contacts,blog,blog/yaki-dokumenty-pereviryty-pered-kupivleiu-kvartyry,privacy,design,nonexistent-page → 78 passed; admin SPEC=021-admin (11 routes, --workers=3) → 78 passed (6 workers: /admin dashboard flaky on networkidle). Screenshots reviewed. Docs: product.md design status + principle 1, conventions.md Styling (palette, radii, fonts, motion) + perf baselines. Admin hint copy aligned to «Ексклюзивні об'єкти» |
| 2026-11-15 | 10 | done | user feedback: collection = 3 regular cards in one row (md:grid-cols-3) + «Уся колекція» → /catalog?deal=sell&sort=price_desc, PropertyCard size lg removed; new «Чому ми / Як ми дбаємо про вашу угоду» (4 numbered principles, brand rules), «Послуги / Чим ми допоможемо» (6 linked tiles; sell / legal / valuation → /contacts, commercial → /catalog?property_type=commercial, 11 results), FAQ (8 questions, native details, FAQPage JSON-LD from the same constants + test); hover lift removed from property and blog cards (shadow + photo zoom kept). ui-check root: 38 passed (one earlier no-js screenshot flake under load). Checked by eye at 1440 and 390. Files: page.tsx, constants/home.ts, features/home/{exclusive-properties,why-us,services,faq}.tsx, property-card, blog-card, features/seo/schemas(.test).ts |
| 2026-11-15 | 11 | done | hero search = text deal tabs (underlined) + one white row of cells (uppercase label + value, hairlines), «Знайти» attached; stacked below 1024; PriceRangeField appearance «cell»; header and mobile-menu CTA = new brand button variant (white on royal blue 5.8:1) in both header states; scroll-in reveals removed from the home card grids (catalog / favourites / similar / blog had none); favourite heart without square (white + soft shadow, saved = brand-on-ink, 44px); card slider buttons rounded-full (documented exception); ArrowRight → ArrowUpRight in 16 files. Checked: home 1440 / 375, light + dark |
| 2026-11-15 | 13 | done | src/components/carousel-arrow.tsx: CarouselArrow { direction prev|next, size sm 44 / md 48 / lg 56, tone light (background/75 + blur) | dark (scrim) }, cva, rounded-full, focus ring, disabled state, default uk aria-labels; used by the card photo slider (hover-reveal kept via className), property gallery and fullscreen viewer (12 usages); shown on /design. Gallery expand / close buttons still use the gallery's own square-ish ROUND_BUTTON (open question) |
| 2026-11-15 | 12 | done | user chose C (after A / B / C, then C traced to the photo + D); home hero: midnight → blueprint traced from house-exterior-1.webp draws (0–1.9 s) → scan line + photo develops (1.0–2.8 s) → lines dim to 0.22 on the matching edges (1.8–3.2 s) → slow drift; pure CSS (HeroBackdrop / HeroTracedScene, hero-blueprint, hero-trace-frame; utilities hero-trace*, hero-draw, hero-develop, hero-scan, hero-drift; old hero-zoom / hero-curtain removed); A and B deleted, /design/hero keeps C and D. perf /: LCP 0.86 → 1.07 s (LCP is the H1 while the photo is still clipped; image at 0.26 s with reduced motion), JS 218.7 KB gz, CLS 0. Checked frames at 1.5 / 3 / 8 s, 1440 and 390 |
| 2026-11-18 | 14 | done | design critique: --radius 0.75rem (rounded-lg…4xl all = 12px), --radius-control 4px; cards borderless / shadowless with zoom-only hover (blog cover got zoomOnHover); DISTRICTS 6 → 10, bento 2×2 + 9; favorites badge brand + ring-background. Files: globals.css, property-card, property-card-skeleton, blog-card, blog-cover, districts, constants/home.ts, favorites-link, design page, conventions.md |
| 2026-11-18 | 15 | drafted | radius audit of the home (design critique): 0px surfaces after slice 14, controls at 12px, sm / md middle values; district arrow kept square (user); stale «round floating button» comment on the chat launcher token fixed in globals.css |
| 2026-11-18 | 16 | done | heart moved from the photo to the price row (FavoriteButton card variant inline, -me-2.5, saved = text-brand fill), deal badge max width freed; «Опубліковано {date}» under the facts via new formatShortDate (Kyiv tz, year only when not current, 4 tests). Checked in the browser: catalog grid + list view, toggle works without navigating |
