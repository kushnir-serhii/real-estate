# 018 — Redesign: Diplomat Hall brand, new type, wider layout

**Status:** in-progress · **Depends on:** 017 · **Route(s):** every public route (`/`, `/catalog`, property pages, `/about`, `/contacts`, `/favorites`, `/blog`, `/privacy`, 404, `/design`); admin gets the new tokens, logo and name only

## Goal
The agency gets a new name and identity: **Diplomat Hall** (shield mark + vertical rule + serif small-caps wordmark). It is a **new** agency, so the site stops claiming years on the market, deal counts, ratings and reviews it doesn't have. When this spec is done the public site uses the new logo and fonts everywhere, has pill-shaped controls, a wider layout with smaller side gutters (reference: serhant.com), a header with the phone number as the first nav item, bigger property cards with a photo slider, and a new district picker where hovering a district name changes the background photo.

The user is still deciding the rest of the redesign; further changes go into a follow-up spec.

## Scope
- In:
  - Fonts: **Sofia Sans** (body / UI), **Sofia Sans Extra Condensed** (headings, hero, prices, emphasized elements), **Cormorant SC** (logo wordmark only). Unbounded and Manrope removed.
  - Pill shapes: `rounded-full` for buttons, inputs, selects (Radix and native), chips, tabs / segmented controls, pagination, icon buttons; matching radii for components where a pill doesn't fit (textarea, popovers, cards).
  - Wider content container and smaller gutters / section spacing on desktop.
  - A reusable `Logo` component (shield mark + vertical rule + "DIPLOMAT / HALL"), and a full rename 7 SKY → Diplomat Hall (site, SEO, brand assets, assistant, seed, tests, docs).
  - Header: desktop drops the phone icon; the phone number becomes the first item of the nav, read from env (mock).
  - Home cleanup for a new agency: no experience claims, no testimonials (deleted), no agents block. The quick search stays.
  - Property card: bigger, with prev / next round chevron buttons on the photo to slide through the property's photos.
  - New district picker section (10 Kyiv districts, hover / focus swaps the background photo), **next to** the existing district bento; the user picks one later.
- Out:
  - Palette changes (Midnight Sky colours stay; only fonts, shapes and spacing change).
  - Removing the existing district bento (the user decides after seeing both).
  - Removing the team from `/about` (only the home agents block goes).
  - Removing the quick search from home (decided 2026-11-13, user: keep it for now; it only gets the new pills and fonts).
  - Admin redesign (it inherits tokens, logo and name; fix regressions only).
  - Real district photos (placeholders now; see **External needs**).

## Design direction (decided)

**Fonts** (all SIL OFL, self-hosted like today: temporary `pnpm add @fontsource-variable/...` / `@fontsource/...`, copy the woff2 into `src/app/fonts/`, keep `OFL.txt` updated, remove the packages; no request to Google Fonts at build or runtime):

| Role | Font | Files | Use |
| --- | --- | --- | --- |
| `--font-sans` | Sofia Sans (variable) | latin + cyrillic, split by `unicode-range` | body, UI, forms, nav |
| `--font-heading` | Sofia Sans Extra Condensed (variable) | latin + cyrillic | h1–h3, hero, section titles, prices, big numbers, eyebrows if they read better |
| `--font-logo` | Cormorant SC (one static weight, 500 or 600) | latin only | the wordmark in `Logo`, nothing else |

Barlow Condensed was the first choice but has **no Cyrillic** (only latin / latin-ext / vietnamese), so Ukrainian headings would fall back to another font. Decided (2026-11-13, user): Sofia Sans Extra Condensed instead.

A condensed heading face needs bigger sizes than Unbounded: re-tune the type scale (hero ≈ 80–104px desktop, ≈ 44–52px at 375px; h2 ≈ 48–64px desktop), weights 600–800, tracking ≈ 0 to slightly positive. Prices and numbers keep `tabular-nums` (check the font has `tnum`; if not, note it in the log and drop the class where it does nothing).

**Shapes:** controls are pills (`rounded-full`): every `Button` size and `icon` variant, `Input`, Radix `Select` trigger, native selects (`form-select`), the deal tabs / segmented controls, chips and badges, pagination, the chat input, the favorite button (already a circle). Where a pill breaks the content: `Textarea` → `rounded-3xl`; popovers / dropdown content → `rounded-2xl` with `rounded-full` items only if they look right; cards and media keep large radii (`rounded-2xl` / `rounded-3xl`). One token decides it (e.g. `--radius-control: 9999px`) so a template buyer can switch back in `globals.css`.

**Layout width (reference serhant.com):** one container token, e.g. `--container-site: 88rem` (1408px) with gutters `px-4 sm:px-6 lg:px-8`, replacing the `max-w-6xl px-4` pattern (18 files today) with one utility (e.g. `site-container`). Home sections get less vertical padding on desktop (today `py-16 sm:py-24` → about `py-12 sm:py-16 lg:py-20`). Final values chosen by eye in slice 3 at 1280, 1440 and 1920px and written in the log.

**Logo:** inline SVG shield (from the user's `logo_shield.svg`, `stroke="black"` → `currentColor`, ViewBox `0 0 262 314`) + a 1px vertical rule (`currentColor`, ≈ 70% of the logo height) + two lines "DIPLOMAT" / "HALL" in Cormorant SC, left-aligned, the two lines filling the shield's height. Variants: `full` (default), `mark` (shield only: below 360px, favicon, compact places). Tones as today (`default`, `header` over the hero, `on-ink`). The whole thing is one link «Diplomat Hall: на головну».

**Header (desktop, `lg`+):** logo left · nav: **phone number first** (`tel:` link, `tabular-nums`, styled as a nav item, maybe a thin divider after it), then Купити, Орендувати, Про нас, Блог, Контакти · right: favorites, theme, dawn CTA. No phone icon on desktop. Below `lg` the phone icon button stays (the user asked for desktop only).

**Phone from env:** `NEXT_PUBLIC_AGENCY_PHONE` (E.164, e.g. `+380000000001`), mock value in `.env.example`; empty = the mock in `CONTACTS`. `CONTACTS.phone` (`display`, `href`) is derived from it in one place, so header, footer, contacts page, JSON-LD, mobile menu and messenger links all follow it. `NEXT_PUBLIC_*` is inlined at build time: changing it needs a rebuild (note in `docs/setup.md`).

## Data
- No schema changes.
- `src/constants/brand.ts`: name «Diplomat Hall», new tagline / title / description (no experience claims).
- `src/constants/contacts.ts`: phone derived from `NEXT_PUBLIC_AGENCY_PHONE`.
- `src/constants/home.ts`: `HERO` without the "з 2014 року" eyebrow and the facts row; `TRUST_STATS` and `ABOUT.chip` removed; new `DISTRICT_PICKER` (10 Kyiv districts: name = catalog `district` value, photo). All 10 exist in the demo seed (Голосіївський, Дарницький, Деснянський, Дніпровський, Оболонський, Печерський, Подільський, Святошинський, Солом'янський, Шевченківський).
- Property cards already receive all photos (`PublishedProperty.property_photos`), so the card slider needs no new query.
- Browser storage keys (`7sky-theme`, `7sky:favorites`, `7sky:assistant-chat`) get the new prefix with a one-time migration from the old keys, like the previous rebrand (`src/lib/legacy-storage.ts`), so nobody loses favourites or the theme.

## Slices

### [x] 1. Fonts and type scale
- **Build:** self-host Sofia Sans, Sofia Sans Extra Condensed (latin + cyrillic, split by `unicode-range` like `manrope.ts`) and Cormorant SC (latin, one weight) per **Design direction**; `--font-sans`, `--font-heading`, new `--font-logo` in `globals.css`; delete the Unbounded and Manrope files and loaders; update `OFL.txt`. Re-tune the type scale utilities (display / h1 / h2 / h3 / eyebrow) for the condensed face; check hero, section headings, prices, card titles, admin headings. `/design` shows the three fonts and the new scale.
- **Files:** `src/app/fonts/*`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/design/page.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] Cyrillic and Latin headings render in Sofia Sans Extra Condensed (no fallback glyphs: checked on «Нерухомість у Києві», «Ґ, Є, Ї, І»)
  - [x] fonts load from local files only; a Latin-only text does not load the Cyrillic file; `package.json` has no fontsource dependency
  - [x] `pnpm perf` on `/`: LCP < 2.5 s, CLS < 0.1; font bytes before and after written in the log
  - [x] typecheck, lint, build green

### [x] 2. Pill controls
- **Build:** `--radius-control` token (pill) and its use in `Button` (all sizes incl. `xs`, `sm`, `icon*`), `Input`, `Select` trigger, `form-select` (native), deal tabs / segmented controls, chips and badges, pagination, chat input, filter controls in the catalog sheet; `Textarea` → `rounded-3xl`; popover / select content → `rounded-2xl`. Horizontal padding of pills adjusted so text doesn't hug the curve. Admin checked for regressions (tables, forms, dialogs).
- **Files:** `src/app/globals.css`, `src/components/ui/{button,input,select,textarea}.tsx`, `src/components/form-select.tsx`, components with their own control radii (`grep rounded-(lg|xl|md)` on interactive elements)
- **Agent:** designer · **Model:** sonnet (the grep-and-replace part can go to haiku)
- **Accept:**
  - [x] every button, input and select on public pages and in the admin is a pill (or a documented exception), in both themes
  - [x] focus rings follow the pill shape; 44px targets kept at 375px
  - [x] switching `--radius-control` back to a small value in `globals.css` restores square-ish controls without touching components

### [x] 3. Wider container and tighter spacing
- **Build:** `--container-site` + one `site-container` utility (max width + responsive gutters) used by header, footer, home sections, page header, catalog, property, blog, contacts, favorites, admin layout where it applies; home section vertical padding reduced on desktop. Grids re-checked at the new width (catalog 3 columns with the filter sidebar at `xl`, home featured 3 columns).
- **Files:** `src/app/globals.css`, the 18 files with `max-w-6xl`, `src/features/home/home-section.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] no `max-w-6xl px-4` left in `src` (one utility instead)
  - [x] at 1440px the content width and side gutters are close to serhant.com (screenshot side by side in the log); at 375px no horizontal page scroll
  - [x] chosen values written in the log

### [x] 4. Logo component and the Diplomat Hall rename
- **Build:** `ShieldMark` (inline SVG, `currentColor`, same geometry as a new `public/brand/diplomat-hall-shield.svg`) and `Logo` with `variant` (`full` / `mark`) and `tone` per **Design direction**; replaces `logo-mark.tsx` and the 7 SKY mark everywhere (header, mobile menu, footer, admin, sign-in, 404, `/design`). Rename: `BRAND` (name, tagline, title, description), `scripts/generate-brand-assets.mjs` draws the shield → regenerate `icon.svg`, `favicon.ico`, `og-default.png`; privacy page and other seed pages, blog seed, assistant system prompt and limits, SERP preview, example domains / handles (`7sky.example`, `t.me/sevensky_demo` → Diplomat Hall equivalents); storage keys renamed with a one-time migration (extend `legacy-storage.ts` to read both old prefixes); `pnpm seed:sql`; tests that pin the old name; docs (`CLAUDE.md`, `README.md`, `docs/*`) say Diplomat Hall. Specs 001–017 keep their history (they described 7 SKY at the time).
- **Files:** `src/components/layout/{logo,shield-mark}.tsx` (delete `logo-mark.tsx`), `public/brand/*`, `src/constants/{brand,contacts}.ts`, `scripts/generate-brand-assets.mjs`, `src/app/{icon.svg,favicon.ico}`, `public/og-default.png`, `src/lib/{theme,legacy-storage}.ts`, `src/features/{favorites/favorites-store,assistant/chat-storage,assistant/build-system-prompt,admin/pages/serp-preview}.ts(x)`, `src/lib/demo/seed/*`, `supabase/seed.sql`, tests, docs
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] `grep -ri "7 sky\|7sky\|sevensky" src scripts supabase public e2e` is empty except the legacy-key constant (split like today so the grep stays empty)
  - [x] logo reads well in the header over the hero, after scroll, on ink (footer) and in the admin, both themes; at 375px it fits next to favorites, phone and menu (mark only below 360px)
  - [x] favourites and theme saved under the old keys survive a reload after the rename (unit test)
  - [x] favicon and OG image show the shield; `pnpm test` (incl. seed.sql drift) green

### [ ] 5. Header: phone as the first nav item
- **Build:** `NEXT_PUBLIC_AGENCY_PHONE` → `CONTACTS.phone` (`display` formatted for Ukraine, `href` = `tel:`), mock in `.env.example`, documented in `docs/setup.md`. Desktop header: phone icon and the `2xl` number removed from the right; the number is the first item in the nav (`tel:` link with `aria-label` «Подзвонити: …»). Below `lg` the phone icon button stays. The full desktop header starts at `xl` (decided): below `xl` it is the tablet header (logo, phone icon, favorites, menu); nav, theme and CTA appear from `xl`.
- **Files:** `src/constants/contacts.ts` (+ a small formatter with a test), `src/components/layout/{site-header,nav-config,mobile-menu}.tsx`, `.env.example`, `docs/setup.md`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] the number shown and dialed everywhere (header, footer, contacts, JSON-LD, mobile menu) comes from the env value, or the mock when it is empty
  - [ ] desktop header: no phone icon; the number sits before «Купити»; readable over the hero and after scroll (AA, both themes); no CLS
  - [ ] below `xl` (375px and 1024px): phone icon button still there, 44px; the mobile menu works at 1024px

### [ ] 6. Home for a new agency
- **Build:** remove experience claims and blocks from home: hero eyebrow «з 2014 року» (keep a neutral one like «Київ і область» or none), hero facts row (12 років, 1 400+ угод, Перевірені документи), `TrustStats` band (and `count-up.tsx` if nothing else uses it), `ABOUT.chip`, `HomeAgents` from home (the team stays on `/about`). `Testimonials` and `TESTIMONIALS` are deleted (component + constants). `QuickSearch` stays where it is (overlapping the hero edge); with the trust band gone, check the spacing below it. Sweep the rest of the public copy for experience claims (`BRAND`, about page, footer, page SEO, assistant prompt / FAQ): nothing says years, deal counts or ratings. Delete components and constants that become unused.
- **Files:** `src/app/(site)/page.tsx`, `src/features/home/{hero,trust-stats,count-up,testimonials,home-agents,home-about}.tsx`, `src/constants/{home,brand,inner-pages,footer,assistant}.ts`, `src/features/assistant/build-system-prompt.ts`, `src/lib/demo/seed/pages.ts`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] `grep` over `src` finds no «2014», «12 років», «1 400», «рейтинг клієнтів» or review text on public pages
  - [ ] home order and spacing still look balanced after the removals (screenshots in both themes)
  - [ ] no unused exports left (lint / typecheck green); the home quick search submits the same params as before; the catalog still has its full filters

### [ ] 7. Bigger property card with a photo slider
- **Build:** card grows (wider container + more generous padding, price ≈ 1.5–1.75rem in the heading font, title `text-lg`, facts `text-base`, photo 4:3 or 3:2 decided by eye). On the photo: two round (`rounded-full`) glass buttons with `ChevronLeft` / `ChevronRight` at the left / right middle, plus a small counter or dots. Desktop: buttons appear on card hover / focus-within; touch: always visible, swipe works too. Only the first photo is in the HTML; the next one loads on the first interaction (or hover intent) so the grid stays light. Cap the slides per card (e.g. 8) and end on the last one or loop (decide, log). Buttons sit above the stretched link like `FavoriteButton` (no nested interactive elements); clicks don't navigate. No JS: buttons hidden (`nojs-hide`), first photo shows. One small client component shared by home, catalog, favorites and similar.
- **Files:** `src/features/properties/{property-card,card-photo-slider}.tsx`, `src/features/home/{featured-grid,featured-skeleton}.tsx`, `src/features/catalog/{catalog-grid,catalog-skeleton}.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] buttons: `aria-label` «Попереднє фото» / «Наступне фото», 44px targets, keyboard reachable, a polite live region or `aria-label` says «Фото 2 з 6»; hidden when the property has one photo or none
  - [ ] first-load JS grows ≤ 2 KB gz on `/` and `/catalog`; extra photos are not requested until the user interacts; no CLS
  - [ ] sold / no photo / long title / no price states still render; hover effects off under reduced motion

### [ ] 8. District picker
- **Build:** a new home section (working name `DistrictPicker`) in the serhant.com «Our Regions» style: section title left («Райони Києва»), a grid of 10 pill buttons (5×2 on desktop, 2 columns on phones), each a link to `/catalog?district=<name>`; behind it a large photo on the right side fading into the background (gradient mask). Hovering or focusing a district crossfades the background to its photo and marks the button active (dawn / primary fill). Prefer CSS only (`:has()` with one rule per item, generated from the constants, or `data-` attributes + a tiny client component if CSS gets unwieldy). Placed right after the featured listings; the existing bento `Districts` stays for now, below it, so the user can compare.
- **Files:** `src/features/home/district-picker.tsx`, `src/constants/home.ts` (`DISTRICT_PICKER`), `src/app/(site)/page.tsx`, `src/app/globals.css` (if CSS-driven)
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] every district opens the catalog filtered to it with results on the demo driver
  - [ ] keyboard focus changes the photo like hover; under reduced motion the swap is instant; without JS the links work and the default photo shows
  - [ ] only the default photo loads eagerly enough to show; the others are small (≤ ~120 KB each) and don't block LCP; text over the photo passes AA
  - [ ] 375px: no horizontal page scroll, 44px targets

### [ ] 9. Inner pages and admin pass
- **Build:** check every route with the new fonts, pills, container and logo: catalog (filters sheet, sort, pagination, empty state), property page (gallery, price block, contact card, mobile bar, similar), `/about`, `/contacts`, `/favorites`, `/blog` + post, `/privacy`, 404, error, admin (sign-in, lists, forms, dialogs). Fix spacing and type that broke; nothing new.
- **Files:** `src/app/(site)/**`, `src/features/**`, `src/app/admin/**` (fixes only)
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] `pnpm ui-check` on all public routes + admin, both themes, 375 / 1440px: screenshots reviewed, results in the log
  - [ ] every state from `docs/conventions.md` → States still designed on the touched pages

## External needs
- Real district photos for the picker (10 Kyiv districts, licensed, landscape, ≥ 1600px wide, ≤ ~120 KB as webp). Until then the slice uses `public/placeholders/*` and marks them `// Mock`.
- The real phone number for `NEXT_PUBLIC_AGENCY_PHONE` and the production domain / Telegram handle for Diplomat Hall (mock values until then).
- The shield source file (`logo_shield.svg`, given in chat) is copied into `public/brand/` in slice 4; a vector of the full lockup is not needed (it is built from the shield + font).
- `wrangler.jsonc` still names the worker `sevensky-web`: renaming it makes the next deploy create a new Cloudflare worker, so the user renames it when convenient (with the routes / domain moved over).
- `supabase/config.toml` `project_id` is now `diplomat-hall`: a running local Supabase stack needs `supabase stop` + `supabase start` under the new id (old local containers stay until removed). Nothing remote.
- No new keys, accounts or migrations.

## Open questions
- **Decided (2026-11-13, user):** headings in Sofia Sans Extra Condensed (Barlow Condensed has no Cyrillic).
- **Decided (2026-11-13, user):** full rename 7 SKY → Diplomat Hall: site, assets, seed, tests and docs.
- **Decided (2026-11-13, user):** remove from home: experience claims, testimonials, agents block. Keep: quick search (for now), how we work, proptech block, about, blog, CTA.
- **Decided (2026-11-13, user):** testimonials are deleted (component + `TESTIMONIALS`), not kept unused; git keeps the history.
- **Decided (2026-11-13, user):** the quick search (with the «Купити / Орендувати / Подобово» tabs) stays on home for now.
- **Decided (2026-11-13, user):** the district picker shows the 10 Kyiv districts and goes next to the existing bento; the user picks one later (then a follow-up removes the other).
- **Decided (2026-11-13, user):** headings in normal sentence case (no uppercase); only small eyebrows are uppercase.
- **Decided (2026-11-13, user):** the logo is monochrome: shield, rule and wordmark all `currentColor` (dark on light, light on dark); no dawn shield.
- **Decided (2026-11-13, user):** the full desktop header (phone number in the nav) starts at `xl` (1280px); below `xl` the header is the tablet one: logo, phone icon, favorites, menu. The nav, theme and CTA move to `xl:` breakpoints.
- **Decided (2026-11-13, user, defaults accepted):** container `--container-site: 88rem`; Cormorant SC weight 600; card slider loops, at most 8 photos, photo 4:3; mock domain `diplomathall.example`, mock Telegram `t.me/diplomathall_demo`; the district picker goes right after «Нові пропозиції».
- **Decided (2026-11-13, user):** spec moved to `ready`; the rest of the redesign the user is still planning goes into a later spec.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-13 | 1 | done: Sofia Sans + Sofia Sans Extra Condensed (latin/cyrillic split) + Cormorant SC 600 (latin, no preload yet); Manrope/Unbounded removed; scale display 48→104, h1 40→72, h2 36→60, h3 24→32 (700/700/700/600), eyebrow 13px; font bytes 121.7 KB → 152.7 KB total (+10 KB on a Cyrillic page); perf `/` LCP 1060 ms, CLS 0, JS 211 KB | `src/app/fonts/*`, `layout.tsx`, `globals.css`, `/design`, OFL.txt |
| 2026-11-13 | 2 | done: `--radius-control` (9999px) → `rounded-control` on buttons, inputs, selects (Radix + native), tabs, chips, badges, pagination, chat input; textarea `rounded-control-multiline` (min(control, 3xl)); dropdowns `rounded-2xl`. Exceptions: favorites counter dot, decorative circles, text links, cards / panels / dialogs, admin loading skeletons (slice 9). Fix found in review: Sofia Sans' Cyrillic defaults to Bulgarian letterforms; both Cyrillic woff2 files remapped to the `.loclRUS` (standard) glyphs, 29 codepoints each | `globals.css`, `components/ui/*`, `form-select.tsx`, 30+ feature components, `src/app/fonts/sofia-sans*-cyrillic-*.woff2` |
| 2026-11-13 | 3 | done: `--container-site: 88rem` + `site-container` (gutters 16/24/32px) in 24 files, no `max-w-6xl` left; 1440px → 1344px content, 48px gutters (serhant range); 1280 → 1216/32; home sections `py-12 sm:py-16 lg:py-20`; edge-to-edge strips and sticky bars follow the 24px gutter (`sm:-mx-6 sm:px-6`); narrow reading columns `px-4 sm:px-6` so they line up with the header | `globals.css`, site / admin layouts, page header, home, property, blog, catalog, contacts, favorites, admin forms |
| 2026-11-13 | 4 | done: `ShieldMark` (clipPath id from `useId`) + `Logo` (`full`/`mark`, tones, sizes sm 36 / md 40–44 / lg 56px, mark only ≤360px), Cormorant SC preloaded; 7 SKY → Diplomat Hall in constants, seed + seed.sql, assets (icon.svg, favicon, OG; OG wordmark in a system serif, sharp can't load woff2), assistant, e2e, docs (product.md «Design status» rewritten); storage keys `diplomat-hall-*` with migration from both old prefixes, incl. the inline theme script (tests); grep for the old name empty | `src/components/layout/{logo,shield-mark}.tsx`, `legacy-storage.ts` + test, `brand.ts`, `contacts.ts`, seed, `scripts/generate-brand-assets.mjs`, assets, docs |
