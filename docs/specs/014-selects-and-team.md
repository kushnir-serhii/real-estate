# 014 — Styled selects and the team on «Про нас»

**Status:** done · **Depends on:** 013 · **Route(s):** `/`, `/catalog`, property pages, `/contacts`, `/about`

## Goal
After the 012 redesign two things still look unfinished: the open list of every native `<select>` is drawn by the browser (white / blue system popup on a midnight page), and «Про нас» talks about the team without showing it. When this is done, every dropdown on the public site opens a list in the Midnight Sky style, and «Про нас» shows the agency's agents.

## Scope
- In:
  - A shared styled select (`src/components/ui/select.tsx`, Radix Select from the `radix-ui` package already installed, shadcn style) and its use in every public form: catalog sort, catalog filters (deal, type, district), filters sheet, quick search on `/` (type, rooms, currency), lead forms (property type), any other public `<select>`.
  - Forms keep submitting the same params; without JS the filters and quick search still work (keep the existing `.nojs-only` / native fallback pattern from 011 / 013, or a hidden native select).
  - Dark-theme contrast bug: the selected currency chip («USD») in the catalog filters is dark text on a dark chip.
  - «Про нас»: a team section with the active agents (cards like on `/contacts`), replacing the «Контакти рієлторів ви знайдете…» text block if it comes from the page body, or added after the body.
- Out:
  - Admin selects (admin keeps native selects).
  - More agents: the user decided to keep 4 active.

## Data
`getActiveAgents()` (`src/lib/db/agents.ts`). The «Про нас» body is CMS markdown from `getPageContent("about")` (demo seed `src/lib/demo/seed/pages.ts`); if the team paragraph lives there, shorten it in the seed and regenerate `supabase/seed.sql`.

## Slices

### [x] 1. Styled select everywhere on the public site
- **Build:** `Select` primitives (trigger 44px, rounded-xl, tokens; content = popover card `bg-popover`, rounded-xl, soft shadow, hairline, max height + scroll; item hover / focus tint `accent`, selected item with a check in `dawn-text` / dawn; keyboard + typeahead from Radix; open/close fade + scale, off under reduced motion). A form-friendly wrapper (`name`, `defaultValue`, `aria-label` / label `htmlFor`) so server-rendered GET forms submit the same params. Replace public native selects. Without JS: a native select still submits (fallback), screens stay usable. Fix the selected currency chip contrast in dark.
- **Files:** `src/components/ui/select.tsx`, a wrapper e.g. `src/components/form-select.tsx`, `src/features/catalog/{catalog-filters-form,sort-select,catalog-sort,filters-sheet}.tsx`, `src/features/home/quick-search.tsx`, lead forms in `src/features/leads/*`, `src/app/globals.css`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] every public dropdown opens a styled list in both themes (screenshots of sort, filters, quick search, lead form at 375 and 1280)
  - [x] URLs after submitting filters / sort / quick search are the same as before; works with JS off (`e2e/no-js.spec.ts` still green)
  - [x] keyboard: open with Enter / Space / arrows, select, Escape closes, focus visible; labels kept
  - [x] selected currency chip passes AA in dark
  - [x] first-load JS growth written in the log (≈ +21 KB gz, accepted: see Decided)

### [x] 2. Team on «Про нас»
- **Build:** a team section on `/about` with the active agents (reuse the `/contacts` agent card or the home agents card; heading «Наша команда» via `SectionHeading`), hidden when there are none, errors don't break the page (same rules as the home agents section). Remove the duplicate text paragraph about the team from the about body if it is in the seed.
- **Files:** `src/app/(site)/about/page.tsx`, `src/features/contacts/agent-card.tsx` or `src/features/home/home-agents.tsx`, `src/lib/demo/seed/pages.ts`, `supabase/seed.sql`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] `/about` shows the 4 demo agents with phone links, at 375 and 1280, both themes, and without JS
  - [x] `pnpm test` green (seed drift included)

## External needs
None. Local only: `DATA_DRIVER=demo` added to the user's `.env.local` (2026-11-05) so `pnpm dev` uses the mock data.

## Open questions
- **Decided (2026-11-05):** Radix Select costs ≈ +21 KB gz first-load JS per route (popper / floating-ui / scroll lock). Accepted: routes stay below the pre-012 baseline (`/` 211.0 vs ~221, `/catalog` 206.0 vs ~216, property 216.5 vs ~226), LCP < 1.1 s, CLS 0; lazy-loading the select would add first-open delay and code for little gain.
- **Note (2026-11-05):** a running `pnpm dev` keeps the demo store in memory (`globalThis`), so seed edits (e.g. the about body) show only after restarting it.
- **Decided (2026-11-05):** keep 4 active agents · `pnpm dev` on demo via `DATA_DRIVER=demo` in `.env.local` (not a project rule change) · admin keeps native selects.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-05 | 1 | done: `ui/select.tsx` (shadcn-style Radix Select on tokens: popover card, `shadow-float`, dawn check, 44px items, fade / zoom off under reduced motion) + `FormSelect` (sentinel `__empty` for ""; with JS a hidden input carries the value, without JS a native select in `<noscript>` and the Radix part in `.nojs-hide` — one named control at a time; `submitOnChange` for sort). Used in catalog filters + sheet, sort, quick search, `PropertyTypeField` (all lead forms). Dark selected currency chip fixed (`dark:has-checked:bg-primary`). URLs same as native (quick search `/catalog?deal=sell&property_type=flat&rooms=2&price_to=90000&currency=USD`, sort `?deal=sell&sort=price_asc`, filters same values). `e2e/no-js.spec.ts` +2 tests (quick search, sort with JS off): 22/22 on `next start`. `pnpm perf` first-load JS: `/` 190.1 → 211.0, `/catalog` 185.1 → 206.0, property 195.7 → 216.5 KB gz; LCP < 1.1 s, CLS 0 | `src/components/{ui/select,form-select}.tsx`, `src/features/catalog/{catalog-filters-form,sort-select}.tsx`, `src/features/home/quick-search.tsx`, `src/features/leads/property-type-field.tsx`, `e2e/no-js.spec.ts` |
| 2026-11-05 | 2 | done: `AboutTeam` (server, awaited — no hiding Suspense; empty / error → hidden + `console.error`), `SectionHeading` «Команда / Наша команда» + 4 `AgentTile` cards (exported from `home-agents.tsx`); review fix: section in the same `max-w-3xl` column as the text, 2×2 grid (no left-edge shift); duplicate team paragraph removed from the about body (seed + default copy), `seed.sql` regenerated; `e2e/no-js.spec.ts` +1 (team visible with JS off): 23/23 on `next start`. Checked in the browser at 1280 dark | `src/features/about/about-team.tsx`, `src/app/(site)/about/page.tsx`, `src/constants/{inner-pages,pages}.ts`, `src/features/home/home-agents.tsx`, `src/lib/demo/seed/pages.ts`, `supabase/seed.sql`, `e2e/no-js.spec.ts` |
