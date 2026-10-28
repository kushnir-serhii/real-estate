# Product

## What it is
The website and admin for **Lyndrik**, a real estate agency in Ukraine. Visitors browse the agency's properties (sale and rent), leave a request or talk to an AI assistant; the manager gets every lead in Telegram and in the admin. Properties come from the agency's CRM (Plektan) or are entered in the admin.

**The site is the foundation, the CRM is optional.** The owner (Andrii) may drop Plektan. Properties, photos, leads and clients therefore live in our Supabase + R2; Plektan is an external source and the channel to the portals, not the store. Without Plektan only portal publishing disappears.

Background, costs and stages: [reference/stack.md](reference/stack.md).

## Users
- **Visitors** — buying or renting; mostly on phones; non-technical. Want real photos, clear price, fast contact.
- **Manager / agent** — gets leads in Telegram, works them in Plektan or in the admin.
- **Admin (Andrii or staff)** — edits SEO and static content; edits properties when the admin is the source of truth.

## Data flows
- **Properties (CRM mode):** Plektan `search` → cron sync (`after_date`) → Supabase, photos copied to R2 → site. Properties that vanish from `search` (non-actual, deferred, closed) are hidden. `is_mls` (partner) objects are skipped. No coordinates in Plektan → geocode. Prices come as text → parse.
- **Properties (admin mode):** admin CRUD → Supabase + R2.
- **Only one source of truth at a time** (a setting), otherwise duplicates.
- **Leads:** form / AI assistant → Supabase **first** → Plektan `addAdvert` → Telegram to the manager. External failures are recorded and retried.
- Owner listings that Plektan scrapes from portals are leads for agents and are **never** shown on the site.

## Core concepts

| Concept | Meaning | Spec |
| --- | --- | --- |
| Property | Flat, house, commercial or plot for sale or rent, with price, areas, rooms, floor, location, photos, SEO. Source: `plektan` or `admin`. Status: published / hidden. | [002](specs/002-data-model.md) |
| Photo | Stored in R2 as WebP in 2–3 sizes, ordered. | [003](specs/003-plektan-sync.md), [008](specs/008-admin-properties.md) |
| Lead | A request from a visitor: contact, what they want, the property it's about, consent, delivery status to Plektan and Telegram. | [006](specs/006-leads.md) |
| Page | Static content (home, about, contacts) with SEO fields. | [004](specs/004-site-shell.md), [009](specs/009-seo.md) |

## Screens

| Screen | Route | Spec |
| --- | --- | --- |
| Home — search entry, featured properties, about, CTA | `/` | [004](specs/004-site-shell.md) |
| Catalog — filters in the URL, list/grid, pagination | `/catalog` (exact URLs per SEO in 005) | [005](specs/005-catalog.md) |
| Property page — gallery, facts, description, location, agent, request form | `/catalog/[slug]` | [005](specs/005-catalog.md) |
| Favorites — saved on the device (localStorage) | `/favorites` | [005](specs/005-catalog.md) |
| About, Contacts, 404 | `/about`, `/contacts` | [004](specs/004-site-shell.md) |
| Admin: sign in, leads | `/admin`, `/admin/leads` | [007](specs/007-admin-leads.md) |
| Admin: properties, photos | `/admin/properties` | [008](specs/008-admin-properties.md) |
| Admin: SEO + pages | `/admin/pages` | [009](specs/009-seo.md) |
| AI assistant — chat widget on every page | — | [010](specs/010-ai-assistant.md) |

The Plektan partner button ("Ми працюємо з Plektan") is mandatory in the footer of every page.

Build order and status: [roadmap.md](roadmap.md). Later options (client login via Telegram/Google, saved searches with Telegram alerts, price-drop alerts, XML feed to LUN, simple lead pipeline) are in [reference/stack.md](reference/stack.md) → «Можливий функціонал»; not planned yet.

## Design principles
**Template, mock data:** for now the site is a template for the real project. All agency data (name, contacts, messengers, texts, coordinates) is mock and lives only as consts in `src/constants/`, so the real agency's data replaces it in one place. Components never hardcode agency data. The seed (`supabase/seed.sql`) is demo data too.

**Design status:** brand, logo and visual design are not defined yet. Build with a neutral placeholder look (shadcn neutral palette, one accent, text wordmark "Lyndrik", placeholder photos). Everything visual goes through tokens in `globals.css` and one `logo.tsx`, so the real design replaces it later without touching pages. Don't ask about branding before it exists.

1. Photos first; clean, calm, trustworthy. Neutral palette + one accent.
2. Mobile-first: catalog, property page and forms must be perfect at 375px.
3. Price always with currency; tabular numbers.
4. Every state designed: loading (skeleton), empty, error with retry, long values, missing photo.
5. WCAG 2.1 AA: contrast, visible focus, labels, 44px touch targets.
6. Fast: Core Web Vitals green on mobile; images sized and lazy.

## Technical frame
- Next.js (App Router, TypeScript) at the repo root, deployed to Cloudflare Workers via OpenNext. SSR/ISR for SEO.
- Supabase Postgres (Pro) with RLS; Supabase Auth for the admin.
- Cloudflare R2 for photos (WebP, 2–3 sizes), Turnstile against spam.
- Plektan CRM API (sync + `addAdvert`), Telegram Bot API (manager notifications), an LLM API for the assistant.
- UI language: Ukrainian.
- Accounts (Supabase, Cloudflare, domain) belong to the client; the developer has access.
