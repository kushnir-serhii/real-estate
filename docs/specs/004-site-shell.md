# 004 — Site shell + static pages

**Status:** ready · **Depends on:** 001 · **Route(s):** `/`, `/about`, `/contacts`, `/privacy`, 404

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

### [ ] 1. Layout: header + footer
- **Build:** `src/app/(site)/layout.tsx` with header + footer; existing `/` moves into `(site)`, `/design` stays outside. Logo is a text wordmark in `src/components/layout/logo.tsx` (placeholder until the brand exists). `src/lib/site-config.ts`. Nav: Купити (`/catalog?deal=sell`), Орендувати (`/catalog?deal=rent_long`), Про нас, Контакти; phone (`tel:`), theme toggle, CTA «Залишити заявку» → `/contacts#zv-yazok`. Mobile menu as a sheet (shadcn Sheet / Radix Dialog). Footer: contacts, Telegram + Viber (WhatsApp supported in config, off), socials hidden while their URL is empty, privacy link, © year, Plektan button. `NEXT_PUBLIC_SITE_URL` + `metadataBase`.
- **Files:** `src/app/(site)/layout.tsx`, `src/app/(site)/page.tsx` (moved), `src/components/layout/{logo,site-header,mobile-menu,site-footer,plektan-button}.tsx`, `src/lib/site-config.ts`, `src/components/ui/sheet.tsx`, `src/app/layout.tsx`, `.env.example`, `docs/setup.md`
- **Agent:** designer
- **Accept:**
  - [ ] Plektan partner button in the footer of every page: static equivalent of the original snippet (it uses `document.write`) — `<a href="https://plektan.com/" title="plektan.com" target="_blank" rel="noopener">` with `<img src="https://plektan.com/img/btn/work-with-plektan-uk.png" alt="Ми працюємо з PLEKTAN CRM" width="120" height="30">`
  - [ ] mobile menu works with keyboard, traps focus, closes on Esc and on navigation, 44px targets
  - [ ] phone and messenger links are tappable (`tel:`, Telegram, Viber)

### [ ] 2. Home
- **Build:** hero with a placeholder photo from `public/placeholders/`, title and lead from `pages.home` (fallback default); quick search — a plain GET `<form action="/catalog">` that works without JS: deal (`deal`), type (`property_type`), rooms (`rooms`: any, 1–4, 5+), max budget (`price_to`) + currency (`currency`, USD by default); empty fields don't break the URL. Featured block: 6 newest published properties as cards (`src/features/properties/property-card.tsx`, basic; 005 extends it) with `formatPrice` (`src/lib/format/format-price.ts`, `uk-UA`, currency always, `tabular-nums`) and Ukrainian labels for deal/type. About block (body of `pages.home` as Markdown), CTA block (phone + messengers). `react-markdown` added. ISR via the cached reads.
- **Files:** `src/app/(site)/page.tsx`, `src/features/home/*`, `src/features/properties/property-card.tsx`, `src/features/properties/property-labels.ts`, `src/lib/format/format-price.ts`, `src/features/pages/{default-pages.ts,markdown.tsx}`
- **Agent:** designer
- **Accept:**
  - [ ] quick search builds the catalog URL (`/catalog?deal=…&property_type=…&rooms=…&price_to=…&currency=…`)
  - [ ] all states: loading skeleton, no featured properties (and Supabase not configured), error with retry, missing photo, long titles
  - [ ] card images have explicit size, no layout shift

### [ ] 3. About, contacts, privacy, 404
- **Build:** `/about` (`pages.about` + fallback); `/contacts` (`pages.contacts` + fallback, contact block with id `zv-yazok`: phone, email, messengers, hours; active agents with "no photo" avatar; lazy OpenStreetMap iframe + «Відкрити в Google Maps» link); `/privacy` (generic Ukrainian template per the Law of Ukraine «Про захист персональних даних», marked as a draft for the client/lawyer; `privacy` row added to `supabase/seed.sql`); 404 inside the site shell with links home / to the catalog. `getActiveAgents()`. `generateMetadata` from the page SEO fields, canonical set.
- **Files:** `src/app/(site)/{about,contacts,privacy}/page.tsx`, `src/app/not-found.tsx` (or a site catch-all), `src/lib/db/agents.ts`, `src/features/contacts/*`, `supabase/seed.sql`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] phone and messenger links are tappable (`tel:`, Telegram/Viber)
  - [ ] unknown URL → 404 with header and footer
  - [ ] map doesn't load until scrolled near (`loading="lazy"`) and has a title

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

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
