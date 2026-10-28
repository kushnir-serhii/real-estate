# 004 — Site shell + static pages

**Status:** done · **Depends on:** 001 · **Route(s):** `/`, `/about`, `/contacts`, `/privacy`, 404

## Goal
The frame of the public site — header, navigation, footer with the mandatory Plektan button — and the static pages, so the site looks like the agency from day one and the home quick search leads visitors into the catalog.

## Scope
- In: `(site)` layout, header (logo, nav, phone, theme toggle, CTA), mobile menu, footer (contacts, messengers, socials, Plektan partner button, privacy policy link), home (hero, quick search, featured properties, about, CTA), about, contacts (agents, map), privacy policy, 404, basic metadata with canonical URLs.
- Out: catalog (005), forms and their logic (006 — here the CTA leads to a "call or message us" block), CMS editing (009).

## Data
- `pages` (002) via `getPage(slug)`, rendered as Markdown with `react-markdown`. When the row is missing or Supabase isn't configured / fails, the page shows built-in default content (`src/features/pages/default-pages.ts`), so production works before 009 and without seed.
- `getPublishedProperties` (002) for featured properties: the 6 newest published.
- New `src/lib/db/agents.ts`: `getActiveAgents()` (cached, tag `agents`).
- Agency contacts in `src/lib/site-config.ts` (phone, email, address, hours, messengers, socials; placeholders from the seed), admin-editable later (009).
- New env var `NEXT_PUBLIC_SITE_URL` (`metadataBase`, canonical URLs) → `.env.example` + `setup.md`.

## Slices

### [x] 1. Layout: header + footer
- **Build:** `src/app/(site)/layout.tsx` with header + footer; existing `/` moves into `(site)`, `/design` stays outside. Logo is a text wordmark in `src/components/layout/logo.tsx` (placeholder until the brand exists). `src/lib/site-config.ts`. Nav: Купити (`/catalog?deal=sell`), Орендувати (`/catalog?deal=rent_long`), Про нас, Контакти; phone (`tel:`), theme toggle, CTA «Залишити заявку» → `/contacts#zv-yazok`. Mobile menu as a sheet (shadcn Sheet / Radix Dialog). Footer: contacts, Telegram + Viber (WhatsApp supported in config, off), socials hidden while their URL is empty, privacy link, © year, Plektan button. `NEXT_PUBLIC_SITE_URL` + `metadataBase`.
- **Files:** `src/app/(site)/layout.tsx`, `src/app/(site)/page.tsx` (moved), `src/components/layout/{logo,site-header,mobile-menu,site-footer,plektan-button}.tsx`, `src/lib/site-config.ts`, `src/components/ui/sheet.tsx`, `src/app/layout.tsx`, `.env.example`, `docs/setup.md`
- **Agent:** designer
- **Accept:**
  - [x] Plektan partner button in the footer of every page: static equivalent of the original snippet (it uses `document.write`) — `<a href="https://plektan.com/" title="plektan.com" target="_blank" rel="noopener">` with `<img src="https://plektan.com/img/btn/work-with-plektan-uk.png" alt="Ми працюємо з PLEKTAN CRM" width="120" height="30">`
  - [x] mobile menu works with keyboard, traps focus, closes on Esc and on navigation, 44px targets
  - [x] phone and messenger links are tappable (`tel:`, Telegram, Viber)

### [x] 2. Home
- **Build:** hero with a placeholder photo from `public/placeholders/`, title and lead from `pages.home` (fallback default); quick search — a plain GET `<form action="/catalog">` that works without JS: deal (`deal`), type (`property_type`), rooms (`rooms`: any, 1–4, 5+), max budget (`price_to`) + currency (`currency`, USD by default); empty fields don't break the URL. Featured block: 6 newest published properties as cards (`src/features/properties/property-card.tsx`, basic; 005 extends it) with `formatPrice` (`src/lib/format/format-price.ts`, `uk-UA`, currency always, `tabular-nums`) and Ukrainian labels for deal/type. About block (body of `pages.home` as Markdown), CTA block (phone + messengers). `react-markdown` added. ISR via the cached reads.
- **Files:** `src/app/(site)/page.tsx`, `src/features/home/*`, `src/features/properties/property-card.tsx`, `src/features/properties/property-labels.ts`, `src/lib/format/format-price.ts`, `src/features/pages/{default-pages.ts,markdown.tsx}`
- **Agent:** designer
- **Accept:**
  - [x] quick search builds the catalog URL (`/catalog?deal=…&property_type=…&rooms=…&price_to=…&currency=…`)
  - [x] all states: loading skeleton, no featured properties (and Supabase not configured), error with retry, missing photo, long titles
  - [x] card images have explicit size, no layout shift

### [x] 3. About, contacts, privacy, 404
- **Build:** `/about` (`pages.about` + fallback); `/contacts` (`pages.contacts` + fallback, contact block with id `zv-yazok`: phone, email, messengers, hours; active agents with "no photo" avatar; lazy OpenStreetMap iframe + «Відкрити в Google Maps» link); `/privacy` (generic Ukrainian template per the Law of Ukraine «Про захист персональних даних», marked as a draft for the client/lawyer; `privacy` row added to `supabase/seed.sql`); 404 inside the site shell with links home / to the catalog. `getActiveAgents()`. `generateMetadata` from the page SEO fields, canonical set.
- **Files:** `src/app/(site)/{about,contacts,privacy}/page.tsx`, `src/app/not-found.tsx` (or a site catch-all), `src/lib/db/agents.ts`, `src/features/contacts/*`, `supabase/seed.sql`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] phone and messenger links are tappable (`tel:`, Telegram/Viber)
  - [x] unknown URL → 404 with header and footer
  - [x] map doesn't load until scrolled near (`loading="lazy"`) and has a title

## External needs
- Logo, brand colors, texts (about, contacts, privacy policy), photos of the team/office from Andrii.
- Real agency phone, email, address, hours, Telegram/Viber/socials for `src/lib/site-config.ts`.
- Privacy policy text reviewed by the client / a lawyer.
- `NEXT_PUBLIC_SITE_URL` (production domain) in Cloudflare.

## Open questions
- ~~Brand/logo?~~ Decided 2026-10-28: not defined yet — text wordmark and placeholder texts/photos; real ones later.
- **Decided 2026-10-28:** messengers Telegram + Viber (WhatsApp supported in config, off); socials hidden while empty.
- **Decided 2026-10-28:** map on contacts — lazy OpenStreetMap iframe + Google Maps link, no map library.
- **Decided 2026-10-28:** `pages` rendered with `react-markdown`; built-in default content when the row is missing or Supabase isn't available.
- **Decided 2026-10-28:** agency contacts in `src/lib/site-config.ts`; `NEXT_PUBLIC_SITE_URL` for canonical URLs.
- **Decided 2026-10-28:** no fake form in 004 — CTA goes to the contacts "call or message us" block; 006 adds the form.
- **Decided 2026-10-28:** Plektan button always shown (static render of the original snippet); removed only if the agency drops Plektan.
- **Decided 2026-10-28:** quick search is a GET form with params `deal`, `property_type`, `rooms`, `price_to`, `currency`; 005 converts `price_to` to `price_usd_to` with the exchange rates.
- **Decided 2026-10-28:** featured = 6 newest published; basic property card built here, extended in 005.
- **Decided 2026-10-28:** agents shown on contacts (`getActiveAgents`); privacy at `/privacy` with a draft template.

- «Купити»/«Орендувати» are never marked active in the nav (would need `useSearchParams`); revisit in 005 if wanted.
- `property_photos.sizes` has no defined shape yet (null in the seed), so cards have no `srcSet` — define it in 003.
- `pnpm typecheck` fails on Next's generated `.next/dev/types/validator.ts` (`noUnusedLocals`) after a dev server ran while the app has no route handlers; deleting `.next/dev` fixes it. Goes away once route handlers exist (006).
- Privacy page shows a «Чернетка» note from `IS_DRAFT = true` in `src/app/(site)/privacy/page.tsx`; set it to `false` once the text is reviewed (until 009 it's a code constant).
- `src/app/not-found.tsx` repeats the shell wrapper (skip link, header, footer) of `(site)/layout.tsx`; could become a shared component later.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-28 | 1 | done | `(site)` layout with skip link; header (nav, phone, theme toggle, CTA; mobile: phone icon + sheet menu), footer (contacts, Telegram/Viber, privacy link, Plektan badge), `site-config.ts`, `NEXT_PUBLIC_SITE_URL` → `metadataBase` + title template. Playwright: menu traps focus, Esc closes and returns focus, closes on link, all targets ≥ 44px; badge image loads (120×30). `sheet.tsx` written by hand (the shadcn CLI wanted to overwrite `button.tsx`). Files: `src/app/(site)/{layout,page}.tsx`, `src/components/layout/*`, `src/components/ui/sheet.tsx`, `src/lib/site-config.ts`, `src/app/layout.tsx`, `.env.example`, `docs/setup.md` |
| 2026-10-28 | 2 | done | Hero (placeholder photo, `scrim`/`on-scrim` tokens so it stays dark in both themes), GET quick search (checked: `/catalog?deal=rent_long&property_type=flat&rooms=2&price_to=20000&currency=UAH`), 6 newest in `<Suspense>` with skeleton / empty (also no Supabase) / error + retry, about (Markdown), CTA. `react-markdown` added; `getPageContent` falls back to built-in defaults and never throws; `formatPrice`; basic `PropertyCard` (fixed 4:3 box, explicit size, «Фото незабаром»). Home is ISR (5 min). Files: `src/app/(site)/page.tsx`, `src/features/{home,pages,properties}/*`, `src/lib/format/format-price.ts`, `src/components/ui/skeleton.tsx`, `src/app/globals.css`, `package.json` |
| 2026-10-28 | 3 | done | `/about`, `/contacts` (contact block `#zv-yazok`, active agents with no-photo avatar, lazy OSM iframe + Google Maps link — checked it loads), `/privacy` (9-section draft template + note; `privacy` row in seed), root `not-found.tsx` inside the shell (HTTP 404), `(site)/error.tsx` + `loading.tsx`, `getActiveAgents()`. Fixed a missing `)` in the seed from the agent and replaced the `contacts` body (it repeated the contact block and promised a form that doesn't exist yet). Local `db reset` OK: 4 pages, 28 published. Files: `src/app/(site)/{about,contacts,privacy}/page.tsx`, `src/app/(site)/{error,loading}.tsx`, `src/app/not-found.tsx`, `src/features/contacts/*`, `src/features/pages/default-pages.ts`, `src/lib/db/agents.ts`, `supabase/seed.sql` |
| 2026-10-28 | UI check | pass | `SPEC=004 ROUTES=root,about,contacts,privacy,nope` — 20/20 (375 + 1280, light + dark); screenshots reviewed. `ui-check.spec.ts`: scrolls the page so lazy images load before the screenshot; ignores the console 404 of the page's own document (404 route). Spec done. |
