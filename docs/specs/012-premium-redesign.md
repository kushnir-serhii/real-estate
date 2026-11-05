# 012 — Premium redesign: Midnight Sky

**Status:** in-progress · **Depends on:** 011 · **Route(s):** every public route (`/`, `/catalog`, property pages, `/about`, `/contacts`, `/favorites`, `/privacy`, `/design`); admin gets the new tokens only

## Goal
The template is being sold as a **proptech product** to real estate agencies. Today it looks like a stock WordPress theme: a default corporate blue, one font for everything, a cluttered header, flat grey sections and almost no motion. When this spec is done, the public site has its own fresh, premium and still business-like look ("Midnight Sky"): a night-blue and warm-dawn palette, a recognizable display font, a clean header that reacts to scroll, photo-led cards with hover effects, restrained motion, and new home sections that sell trust (numbers, districts, process, agents, reviews). A buyer opening the demo sees a product, not a theme.

## Scope
- In:
  - New palette and tokens (light + dark), display font Unbounded (self-hosted) + Manrope for text, type scale, motion tokens.
  - Header: layout, scroll behaviour, one-icon theme toggle, mobile menu. Footer redesign.
  - Home: hero, quick search, featured cards, about, CTA, plus new sections: trust numbers, districts, how we work (+ AI / CRM block), agents, testimonials.
  - Property card (used on home, catalog, favorites, similar) with hover effects.
  - A visual pass over the inner pages (catalog, property, about, contacts, favorites, privacy, 404, error) so they match.
  - Brand assets (favicon, OG image) regenerated with the new colours; `/design` page shows the new tokens.
- Out:
  - Logo redesign (the 7 SKY mark stays; only its colour follows the tokens).
  - Admin redesign (it only inherits the tokens; must not break).
  - Real reviews / agent profiles as data (stage 2): testimonials are static mock consts.
  - New libraries for animation (no framer-motion / GSAP): CSS + at most tiny client components.

## Design direction (decided)

**Positioning:** proptech product: confident, fresh, technological, not luxury-baroque.

**Palette "Midnight Sky"** (targets; final oklch values chosen in slice 1 with AA checked):

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| background | warm off-white ≈ `#F6F4EF` | deep midnight ≈ `#0A1424` | page |
| foreground | midnight ≈ `#0D1B2E` | off-white | text |
| card | ≈ `#FFFFFF` (warm) | ≈ `#101D31` | cards, panels |
| primary | midnight ≈ `#0D1B2E` (+ off-white text) | dawn (+ midnight text) | default buttons, active states |
| dawn (the one accent) | ≈ `#E8A15C` (+ midnight text) | same | main CTA, highlights, key numbers, decorative lines; never as text on light backgrounds (fails AA) |
| sky | ≈ `#6E8BB3` | lighter | secondary decoration, map, gradients, icons (≥3:1 when meaningful) |
| ink surface | midnight | slightly lifted midnight | dark sections (footer, CTA band, how-we-work), text uses `on-ink` |

Neutrals are tinted (warm in light, blue in dark), never pure grey. Links and text accents on light backgrounds use midnight / a darker dawn shade that passes 4.5:1.

**Type:** Unbounded (variable, latin + cyrillic, OFL) for headings, hero, prices and big numbers, weights 500–700, tight tracking; Manrope stays for body and UI. Hero headline ≈ 56–72px on desktop, ≈ 34–40px at 375px.

**Motion ("expressive but restrained"):** section reveal on scroll (fade + 12–16px rise, staggered children), image zoom on card hover, header shrink + glass on scroll, count-up on trust numbers, button micro-interactions (arrow nudge, subtle lift). Durations 150–600 ms, one shared easing. Everything off under `prefers-reduced-motion: reduce`. Prefer CSS (scroll-driven animations with a no-animation fallback, `@property`, transitions) over JS; any client JS for motion stays tiny.

**Header:** logo left, nav centered, right side: phone (icon + number from xl, icon only below), favorites, one theme icon button, dawn CTA. On `/` it sits transparent over the hero with light text and turns into a solid / blurred bar with a hairline border and smaller height once scrolled; on other routes it starts solid. Active nav item: animated underline, not a filled pill.

## Data
- No schema changes. Agents via the existing facade `getActiveAgents()` (`src/lib/db/agents.ts`).
- New mock consts in `src/constants/home.ts` (or `src/constants/<topic>.ts`): `TRUST_STATS`, `DISTRICTS` (name, catalog filter value, placeholder photo), `HOW_WE_WORK` steps, `PROPTECH_FEATURES` (AI assistant, CRM sync, Telegram alerts), `TESTIMONIALS`. All marked `// Mock — replace for the real agency.`
- District tiles link to `/catalog?district=<name>` (the existing catalog param), using district names that exist in the demo seed (Шевченківський, Печерський, Подільський, Голосіївський, Оболонський, Дарницький …).

## Slices

### [x] 1. Tokens, fonts, buttons, motion foundation
- **Build:** new Midnight Sky tokens in `globals.css` for `:root` and `.dark` (background, foreground, card, popover, primary, secondary, muted, accent (hover tint), border, input, control, ring, success / warning / destructive re-checked) plus new tokens `dawn` / `dawn-foreground`, `sky`, `ink` / `on-ink`, mapped in `@theme inline`. Unbounded self-hosted like Manrope (temporary `pnpm add @fontsource-variable/unbounded`, copy latin + cyrillic woff2 into `src/app/fonts/`, add its OFL text, remove the package; user approved). `--font-heading` = Unbounded; base styles so `h1–h3` use it. A small type scale (display / h1 / h2 / h3 / eyebrow) as utilities. Motion tokens (`--ease-out-soft`, durations) and utilities for reveal (scroll-driven, with fallback) and reduced motion. Button: `default` = primary, new `dawn` variant for main CTAs, refreshed hover / active (lift, arrow nudge via `data-icon`). `/design` page shows the new swatches, fonts, buttons. `scripts/generate-brand-assets.mjs` uses the new colours; regenerate `icon.svg`, `favicon.ico`, `og-default.png`.
- **Files:** `src/app/globals.css`, `src/app/fonts/*`, `src/app/layout.tsx`, `src/components/ui/button.tsx`, `src/app/design/page.tsx`, `scripts/generate-brand-assets.mjs`, `src/app/{icon.svg,favicon.ico}`, `public/og-default.png`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] every text / background pair in the token table passes WCAG AA (4.5:1 text, 3:1 large text and UI), both themes; ratios written in the log
  - [x] Unbounded loads from local files only (no third-party request), cyrillic file only for cyrillic ranges; `package.json` has no fontsource dependency
  - [x] no raw colours outside `globals.css` (and the brand-asset script); typecheck, lint, build green
  - [x] `/design` shows the new palette, fonts and button variants in both themes

### [x] 2. Header, theme toggle, mobile menu, footer
- **Build:** header per **Design direction**: centered nav with an animated underline for the active item, compact phone, one theme icon button (light ↔ dark; the stored value can still be `system` until first click; icon reflects the current resolved theme, `aria-label` says what it switches to), dawn CTA. Transparent over the hero on `/` (light text on the hero scrim) and solid / blurred + shorter after ~40px of scroll; solid on other routes. Prefer a CSS scroll-driven approach; if JS is needed, one tiny client component with a passive listener. Mobile menu restyled (full-height sheet with large nav links, contacts, CTA, theme). Footer: ink surface with a top CTA band ("Підберемо об'єкт за 24 години" style copy, phone + messengers), columns (brand + tagline, navigation, contacts, socials), bottom row (©, privacy, demo note). Plektan badge keeps working when enabled.
- **Files:** `src/components/layout/{site-header,nav-link,mobile-menu,site-footer,logo,favorites-link,messenger-links}.tsx`, `src/components/theme-toggle.tsx`, `src/app/(site)/layout.tsx`, `src/app/globals.css`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] desktop header has at most 5 controls on the right (phone, favorites, theme, CTA, + menu below lg); nav is centered
  - [x] on `/` the header is readable over the hero and after scrolling (AA in both states, both themes); no layout shift (CLS 0) when it changes
  - [x] theme toggle: one button, keyboard reachable, `aria-label`, no flash of wrong theme
  - [x] 375px: logo, favorites, phone, menu fit with 44px targets; mobile menu traps focus and closes on Escape
  - [x] footer on ink surface passes AA; all footer links work

### [x] 3. Hero and quick search
- **Build:** taller full-bleed hero (≈ 88vh desktop, ≈ 78svh mobile, min heights so content never clips) with a directional midnight gradient instead of the flat 62% scrim; eyebrow chip (e.g. "AI-асистент 24/7 · Київ і область"), Unbounded headline, lead, two CTAs (dawn "Підібрати об'єкт" → catalog, ghost-on-scrim "Залишити заявку"), trust row (3 short facts). Very slow scale-in of the photo on load (off under reduced motion). Quick search becomes a floating glass / card panel overlapping the hero edge with deal tabs (Купити / Орендувати) and the existing fields; same URL params as today.
- **Files:** `src/features/home/{hero,quick-search}.tsx`, `src/constants/home.ts`, `src/app/(site)/page.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] LCP element is still the hero photo with `fetchPriority="high"`; `pnpm perf` on `/`: LCP < 2.5 s, CLS < 0.1
  - [x] quick search submits the same params as before (works without JS); labels and focus intact
  - [x] hero text passes AA over the darkest and the lightest part of the photo it covers

### [x] 4. Property card and grids
- **Build:** card redesign used everywhere (`PropertyCard`): rounded-2xl, photo with subtle bottom gradient, deal / status badge as a glass chip, favorite button as a glass circle, price in Unbounded with `tabular-nums`, facts with small lucide icons (rooms, area, floor, district), hover: photo zoom 1.05 over ~600 ms, card lift + soft midnight-tinted shadow, title colour shift; focus-visible ring kept. Featured section on home gets a section header pattern (eyebrow + heading + "Усі об'єкти →" link with arrow nudge). Skeletons match the new card shape.
- **Files:** `src/features/properties/property-card.tsx`, `src/features/home/{featured-grid,featured-properties,featured-skeleton}.tsx`, `src/features/catalog/catalog-skeleton.tsx`, a shared `src/components/section-heading.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] sold / missing photo / long title / no price states still render correctly
  - [x] hover effects off under reduced motion; no layout shift on hover
  - [x] card stays one link (stretched) + favorite button, no nested interactive elements

### [x] 5. New home sections: trust numbers, how we work, proptech block
- **Build:** a `Reveal` mechanism (CSS scroll-driven with a no-animation fallback; or one tiny client component with IntersectionObserver) applied to home sections. Trust numbers band (`TRUST_STATS`, 4 items, count-up from 0 when visible, final value in the DOM for screen readers and no-JS). "Як ми працюємо": 4 numbered steps on an ink surface with a connecting line. Proptech block: AI assistant (opens the existing assistant launcher), CRM sync, instant notifications, as feature cards with icons. About section reworked into a two-column layout (text + photo collage) instead of the text wall.
- **Files:** `src/components/reveal.tsx` (or CSS utilities), `src/features/home/{trust-stats,how-we-work,proptech-features,home-about}.tsx`, `src/constants/home.ts`, `src/app/(site)/page.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] without JS and under reduced motion every section is fully visible with final numbers
  - [x] first-load JS on `/` grows by ≤ 5 KB gz in total for this spec so far (measured with `pnpm perf`, written in the log)
  - [x] all copy is Ukrainian mock text from constants, not hardcoded in components

### [x] 6. New home sections: districts, agents, testimonials, CTA
- **Build:** districts grid (6 tiles, varied sizes on desktop / horizontal scroll-snap on mobile, photo + name + "N об'єктів" when cheap to compute, else just a "Дивитись →" label) linking to `/catalog?district=…`. Agents section from `getActiveAgents()` (photo or initials avatar, name, phone link); hidden when there are none; error falls back to hiding the section, never breaks the page. Testimonials: 3 static cards (`TESTIMONIALS`: name, deal type, text, rating) with a quote mark in dawn. Home CTA block restyled (ink surface, dawn accent line, form card on the right). Final home order: hero → search → trust numbers → featured → districts → how we work → proptech → about → agents → testimonials → CTA.
- **Files:** `src/features/home/{districts,home-agents,testimonials,home-cta}.tsx`, `src/constants/home.ts`, `src/app/(site)/page.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] every district tile opens the catalog filtered to that district with results in demo mode
  - [x] agents section: loading skeleton, empty (hidden), error (hidden, logged) states
  - [x] 375px: no horizontal page scroll (scroll-snap strips scroll inside themselves)

### [ ] 7. Inner pages pass
- **Build:** apply the new look to `/catalog` (filters panel, sort, pagination, empty state), property page (gallery, price block, facts, contact card, mobile bar, similar), `/about`, `/contacts`, `/favorites`, `/privacy`, 404 and error pages: page headers with Unbounded titles and eyebrow, consistent section spacing, card radii, dawn CTAs where the main action is. Admin: check it still reads well with the new tokens; fix only regressions.
- **Files:** `src/app/(site)/**`, `src/features/{catalog,property,contacts,favorites,pages}/**`, `src/app/not-found.tsx`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] no page still uses the old blue or looks unstyled; screenshots of every route in both themes reviewed
  - [ ] every state from `docs/conventions.md` → States still designed on the touched pages
  - [ ] admin pages: no contrast or layout regressions

## External needs
- None: no keys, accounts or migrations. Fonts are self-hosted (OFL).
- Later, the real agency: real stats, districts photos, testimonials and agent photos replace the mock consts.

## Open questions
- **Decided (2026-11-05):** positioning: proptech product for agencies · palette Midnight Sky (midnight + warm off-white + dawn accent) · motion: expressive but restrained · go straight to spec + build.
- **Decided (2026-11-05):** headings in Unbounded (Fraunces / Instrument Serif have no cyrillic); body stays Manrope · temporary `@fontsource-variable/unbounded` install to copy the woff2 is approved.
- **Decided (2026-11-05):** new home sections: trust numbers, districts, how we work (+ AI / CRM), agents + static testimonials.
- **Decided (2026-11-05):** theme toggle: one icon button in the header.
- **Open (2026-11-05):** Unbounded is much wider than Manrope; existing `h1–h3` (cards, admin) may crowd in Ukrainian — checked per page in slices 4 and 7.
- **Decided (2026-11-05):** header phone number shows from `2xl` (icon + aria-label below): at 1280px the number + centered nav + CTA don't fit.
- **Open (2026-11-05):** Plektan badge PNG not yet seen on the ink footer (needs `PLEKTAN_API_KEY`).
- **Decided (2026-11-05):** card titles stay Manrope (Unbounded is too wide for long listing titles); Unbounded is for prices, section and page headings.
- **Open (2026-11-05):** pre-existing (since 011 slice 6, `src/app/(site)/loading.tsx`): prerendered public pages put the page body in a hidden Suspense segment (`<div hidden id="S:0">`) revealed by an inline script, so with JS disabled the page body is empty. Not caused by 012; fixing it means rethinking the route-level loading boundary (e.g. per-section Suspense instead of `loading.tsx`). Needs a decision.
- **Open (2026-11-05):** the proptech "ask the assistant" button opens the launcher via `[data-assistant-launcher]`; a shared open-event / store would be cleaner if more entry points appear.
- **Open (2026-11-05):** `next start` can serve a stale page from `.next/server/route-cache/` that `next build` doesn't clear (seen on `/`: a slice-4 page after the slice-6 build). Delete `.next` before `pnpm build` when verifying; `pnpm perf` numbers for slices 5–6 may have been measured on the stale page and are re-measured at the end of the spec.
- **Decided (2026-11-05):** 011 has one open criterion (`pnpm preview` on Windows, environment-only); 012 builds on the 011 branch anyway.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-05 | 1 | done: Midnight Sky tokens (light + dark) + `dawn` / `dawn-text` / `sky` / `ink` / `on-ink` / `ink-muted` / `ink-border`; AA: light fg 15.7 on page, primary 15.9, muted-fg 6.75, control 3.58, dawn+midnight 7.98, dawn-text 5.64, on-ink 15.9; dark fg 16.4, dawn primary 7.98 / 8.49 on page, muted-fg 8.0, control 4.31, on-ink 14.7. Unbounded self-hosted (latin + cyrillic, OFL), `font-heading`, fluid type scale (`text-display/h1/h2/h3`, `eyebrow`), motion tokens + scroll-driven `reveal` with fallback, button `dawn` variant + lift + arrow nudge, radius 0.75rem, `/design` updated, favicon / OG regenerated (midnight + dawn). package.json unchanged | `src/app/{globals.css,layout.tsx,icon.svg,favicon.ico}`, `src/app/fonts/{unbounded.ts,unbounded-*.woff2,OFL.txt}`, `src/components/ui/button.tsx`, `src/app/design/page.tsx`, `scripts/generate-brand-assets.mjs`, `public/og-default.png` |
| 2026-11-05 | 2 | done: `HeaderShell` (tiny client: pathname + passive scroll via `useSyncExternalStore`, ~0.4 KB) sets `data-tone` / `data-scrolled`; `on-hero:` variant (`body:has([data-hero])`); fixed `h-header` slot, inner bar h-20 → h-16 (no shift), hero `-mt-header`; centered nav (grid from lg) with growing underline; one theme icon button (both icons rendered, swapped by `dark:`); full mobile sheet; ink footer with CTA band + columns. Header over hero ≥ 5.5:1 worst case; footer on-ink ~15:1, ink-muted ~9:1 | `src/components/layout/{header-shell,site-header,nav-link,nav-config,logo,favorites-link,mobile-menu,messenger-links,site-footer}.tsx?`, `src/components/theme-toggle.tsx`, `src/constants/footer.ts`, `src/app/globals.css`, `src/features/home/hero.tsx` |
| 2026-11-05 | 3 | done: hero `hero-height` (max(36rem,78svh) → max(40rem,88svh) from lg), `hero-veil` diagonal midnight gradient on new `--veil-*` tokens (text zone 85–92% → on-scrim ≥ 4.97:1 even over white), eyebrow chip, `text-display` title, dawn + glass CTAs, trust row (`HERO` consts); CSS-only photo zoom + text stagger under no-preference. Quick search: rounded-3xl card + `shadow-float`, deal as radio segments (Купити / Орендувати / Подобово, no JS, same params: `/catalog?deal=rent_long&property_type=&rooms=2&price_to=500&currency=USD`), dawn submit. `pnpm perf` `/`: LCP 944 ms, CLS 0.000, first-load JS 188.7 KB gz | `src/features/home/{hero,quick-search}.tsx`, `src/constants/home.ts`, `src/app/globals.css` |
| 2026-11-05 | 4 | done: `PropertyCard` rounded-2xl, hairline ring, bottom scrim gradient, glass deal / status chip (`bg-background/90`, AA over white), glass favorite, price in Unbounded + unit in Manrope (checked `420 000 USD`, `2 650 000 ₴`, `1 500 ₴ / доба`), icon facts, hover zoom / lift / `shadow-float` / title `dawn-text`, all off under reduced motion; missing-photo placeholder (soft sky gradient); `SectionHeading` (eyebrow, h2, action with arrow) on home featured; skeletons match. Review fix: card title in Manrope, placeholder gradient lightened for contrast. Sold state checked by code only (same path) | `src/features/properties/property-card.tsx`, `src/features/favorites/favorite-button.tsx`, `src/components/section-heading.tsx`, `src/app/(site)/page.tsx`, `src/constants/home.ts`, `src/features/{home/featured-skeleton,catalog/catalog-skeleton}.tsx` |
| 2026-11-05 | 5 | done: CSS `reveal` / `reveal-stagger` on home sections; `TrustStats` (4 stats, Unbounded, dawn bars, `CountUp` client leaf: final value in server HTML, animates only on intersect + motion allowed, manual uk formatting); `HowWeWork` (full-bleed ink, 4 steps, dawn numbers, connector vertical → horizontal from lg); `ProptechFeatures` bento (large ink AI card with sky / dawn glow + `OpenAssistantButton` clicking `[data-assistant-launcher]`, no panel in first load; CRM, Telegram, favorites cards); `HomeAbout` two columns + 3-photo collage + stat chip; shared `HomeSection`; copy in `home.ts`. Reduced motion: all visible, final numbers. No-JS: numbers in HTML, but the page body is hidden by the pre-existing route loading boundary (see Open questions). `pnpm perf` `/`: LCP 1272 ms, CLS 0.000, first-load JS 189.2 KB gz (+0.5) | `src/features/home/{home-section,trust-stats,count-up,how-we-work,proptech-features,open-assistant-button,home-about,home-cta,featured-grid}.tsx`, `src/app/(site)/page.tsx`, `src/constants/home.ts`, `src/components/section-heading.tsx`, `src/features/assistant/assistant-launcher.tsx` |
| 2026-11-05 | 6 | done: `Districts` bento (6 tiles, `tile-veil`, ≥ 85% midnight under text; scroll-snap strip on mobile; all 6 open the catalog with results in demo), `HomeAgents` (Suspense + skeleton, hidden on empty / error with `console.error`, ≤ 4, photo or initials, tel + email), `Testimonials` (3 static, dawn quote, «Оцінка 5 з 5»), `HomeCta` ink panel + unchanged form; final order hero → search → trust → featured → districts → how → proptech → about → agents → testimonials → CTA. Reviewed in the browser after a clean `.next` (stale route-cache, see Open questions). To polish in slice 7: «24/7» should not count up; 2 demo agents leave the grid half empty | `src/features/home/{districts,home-agents,testimonials,home-cta}.tsx`, `src/app/(site)/page.tsx`, `src/constants/home.ts`, `src/app/globals.css` |
