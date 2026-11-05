# 014 — Styled selects and the team on «Про нас»

**Status:** ready · **Depends on:** 013 · **Route(s):** `/`, `/catalog`, property pages, `/contacts`, `/about`

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

### [ ] 1. Styled select everywhere on the public site
- **Build:** `Select` primitives (trigger 44px, rounded-xl, tokens; content = popover card `bg-popover`, rounded-xl, soft shadow, hairline, max height + scroll; item hover / focus tint `accent`, selected item with a check in `dawn-text` / dawn; keyboard + typeahead from Radix; open/close fade + scale, off under reduced motion). A form-friendly wrapper (`name`, `defaultValue`, `aria-label` / label `htmlFor`) so server-rendered GET forms submit the same params. Replace public native selects. Without JS: a native select still submits (fallback), screens stay usable. Fix the selected currency chip contrast in dark.
- **Files:** `src/components/ui/select.tsx`, a wrapper e.g. `src/components/form-select.tsx`, `src/features/catalog/{catalog-filters-form,sort-select,catalog-sort,filters-sheet}.tsx`, `src/features/home/quick-search.tsx`, lead forms in `src/features/leads/*`, `src/app/globals.css`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] every public dropdown opens a styled list in both themes (screenshots of sort, filters, quick search, lead form at 375 and 1280)
  - [ ] URLs after submitting filters / sort / quick search are the same as before; works with JS off (`e2e/no-js.spec.ts` still green)
  - [ ] keyboard: open with Enter / Space / arrows, select, Escape closes, focus visible; labels kept
  - [ ] selected currency chip passes AA in dark
  - [ ] first-load JS growth ≤ 5 KB gz per route (Radix Select), written in the log

### [ ] 2. Team on «Про нас»
- **Build:** a team section on `/about` with the active agents (reuse the `/contacts` agent card or the home agents card; heading «Наша команда» via `SectionHeading`), hidden when there are none, errors don't break the page (same rules as the home agents section). Remove the duplicate text paragraph about the team from the about body if it is in the seed.
- **Files:** `src/app/(site)/about/page.tsx`, `src/features/contacts/agent-card.tsx` or `src/features/home/home-agents.tsx`, `src/lib/demo/seed/pages.ts`, `supabase/seed.sql`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] `/about` shows the 4 demo agents with phone links, at 375 and 1280, both themes, and without JS
  - [ ] `pnpm test` green (seed drift included)

## External needs
None. Local only: `DATA_DRIVER=demo` added to the user's `.env.local` (2026-11-05) so `pnpm dev` uses the mock data.

## Open questions
- **Decided (2026-11-05):** keep 4 active agents · `pnpm dev` on demo via `DATA_DRIVER=demo` in `.env.local` (not a project rule change) · admin keeps native selects.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
