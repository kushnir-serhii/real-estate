# Conventions

Every slice is checked against these rules. If a rule gets in the way, raise it in the spec's open questions instead of breaking it quietly.

## Stack (don't add libraries without asking)
Next.js (App Router) · React · TypeScript (strict) · Tailwind 4 · shadcn/ui (Radix) · lucide-react · zod · `@supabase/supabase-js` + `@supabase/ssr` · `@opennextjs/cloudflare` (+ wrangler) · `@aws-sdk/client-s3` for R2 (or the R2 binding) · Playwright (UI check only) · `mermaid` (dev-only, renders `pnpm diagrams`). Versions are fixed in spec 001.

## Files and folders
**Every file and folder name is `kebab-case`.** Next.js reserved files keep their names (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `sitemap.ts`, `robots.ts`).

| What | Where | Inside |
| --- | --- | --- |
| Route | `src/app/(site)/catalog/[slug]/page.tsx` | `const PropertyPage = async (…) => …` + `export default` |
| Admin route | `src/app/admin/…` | same; protected by the admin layout + `src/proxy.ts` |
| API / cron / webhooks | `src/app/api/<name>/route.ts` | |
| Server actions | `src/features/<domain>/actions.ts` | `'use server'` at the top |
| Component | `src/features/<domain>/property-card.tsx` | `export const PropertyCard = …` |
| Shared UI | `src/components/layout/`, `src/components/` | |
| shadcn primitive | `src/components/ui/button.tsx` | as the CLI generated it |
| Agency-specific data | `src/constants/<topic>.ts` (`contacts`, `brand`, `home`, `pages`, …) | `UPPER_SNAKE_CASE` consts `as const`; mock values until the real agency's data arrives |
| Data access (facade) | `src/lib/db/<domain>.ts` | `getPublishedProperties(…)`: the only thing `src/features/**` and `src/app/**` import; adds caching, picks the driver |
| Data drivers | `src/lib/db/supabase/<domain>.ts`, `src/lib/demo/db/<domain>.ts` | implement the types in `src/lib/db/driver-types.ts`; `DATA_DRIVER` is read in `src/lib/data-driver.ts` only |
| Demo data | `src/lib/demo/store.ts`, `src/lib/demo/seed/*` | rows typed from `database.types.ts`; the store mirrors RLS |
| External client | `src/lib/plektan/`, `src/lib/telegram/`, `src/lib/r2/`, `src/lib/turnstile/`, `src/lib/geocode/`, `src/lib/llm/` | |
| Supabase clients | `src/lib/supabase/public.ts`, `server.ts`, `admin.ts` | |
| DB types | `src/lib/supabase/database.types.ts` | generated, never hand-edited |
| Migrations | `supabase/migrations/<timestamp>_<name>.sql` | |

- The file name is the kebab-case form of its main export. One exported component per file; small private helpers may stay next to it.
- Our components are arrow functions with named exports; pages and layouts use default exports (Next.js). shadcn files keep their CLI style.
- Identifiers: components and types `PascalCase`; variables, functions, hooks `camelCase`; constants `UPPER_SNAKE_CASE`.
- Import through the `@/` alias. No deep relative paths.

## TypeScript
- No `any`. Use `unknown` and narrow (zod at every boundary: Plektan responses, form input, route handler bodies, LLM output). No `as` casts without a comment saying why.
- `import type` for type-only imports. No `enum` / `namespace`: use `as const` arrays plus a derived union.
- DB row types come from the generated `database.types.ts`; derive with `Pick` / `Omit`, don't redeclare.
- State as discriminated unions, not boolean flags. Exhaustive `switch` ends with a `never` check.
- Props types are `<Component>Props`, next to the component.

## Next.js
- Server Components by default. `'use client'` only where interactivity needs it, pushed to the leaves.
- Public pages are statically rendered / ISR where possible; revalidate by tag after sync or admin edits (`revalidateTag`). No `cache: 'no-store'` on public pages without a reason.
- Mutations go through server actions or route handlers, validated with zod, never trusting the client.
- Filters, sort, pagination and tabs live in the URL (`searchParams`).
- Every route segment that loads data has `loading.tsx` (skeleton) and `error.tsx` (message + retry) where it makes sense.
- Metadata via `generateMetadata`; canonical URLs always set.
- Images: `next/image` (or `<img>` with explicit `width`/`height`, `srcset` from the R2 sizes, `loading="lazy"` below the fold). Never layout shift.
- Runtime is Cloudflare Workers (OpenNext): no Node-only APIs (`fs`, `sharp`, native modules) in request code. Check new dependencies for Workers compatibility.

## Data (Supabase)
- Three clients: `public.ts` (anon key, no cookies, for public cached reads), `server.ts` (anon key + user session, for pages and actions), `admin.ts` (service role — server only, sync and admin actions; `import 'server-only'`).
- Every table has RLS in the migration that creates it. Public read only of published properties and their photos; leads have no public read; writes from the site only via server code.
- Prices: integer amount + `currency` (`UAH` | `USD` | `EUR`). Format only through `formatPrice` (locale `uk-UA`). Keep the Plektan raw text in `raw` for debugging.
- Keep Plektan's original payload (`raw jsonb`) and ids (`external_id` = `adid`) on synced rows; our own `id` is a uuid.
- Slugs are stable once published (they're in Google's index).

### Data drivers (spec 011)
- Two drivers sit behind every data module: `supabase` (the queries) and `demo` (in-memory store seeded from `src/lib/demo/seed/`). `DATA_DRIVER=demo|supabase`; empty = `supabase` if the Supabase env is set, else `demo`.
- Callers import the facade `src/lib/db/<domain>.ts` and never branch on the driver (`isDemoMode()` / `hasPublicData()` live in `src/lib/data-driver.ts`, used by infrastructure such as `proxy.ts`, not by features). Shared pure logic (zod schemas, types, constants, derive helpers) stays in the facade or a `<domain>-query.ts` / `-values.ts` file next to it, never inside a driver.
- The facade owns caching (`unstable_cache`, tags) and puts the driver into the cache key, so both drivers cache the same way. The facade loads a driver with a dynamic `import()`, so the other one never enters the request.
- A demo driver must behave like SQL + RLS: public reads see only published, non-hidden properties (plus the 7-day sold window on detail) and active agents; return copies, never store rows; private columns (`raw`, `house`, `agent_id`) stay out of public results.
- Env is read lazily (inside functions), never at import time. Nothing on the demo path may call a Supabase client.
- `supabase/seed.sql` is generated output: change `src/lib/demo/seed/`, run `pnpm seed:sql` and commit both (a test fails on drift). The generator (`src/lib/demo/seed/sql.ts`) writes dates relative to `now()` and inserts in foreign-key order; a new table with seed rows is added there.
- Production-build guard (`src/lib/build-guard.ts`, run from `next.config.ts`): `DATA_DRIVER=supabase` without the public Supabase env fails the build; the `demo` driver builds with nothing and logs «demo mode». `getSiteUrl()` without `NEXT_PUBLIC_SITE_URL` falls back to localhost with a warning on `demo`, and fails the build on `supabase`.
- A new data function adds: its type in `driver-types.ts`, both implementations, and a case in `src/lib/db/driver-contract.test.ts` (runs on the demo driver always, on Supabase when a local DB is reachable).

## Integrations
- One client per service in `src/lib/<service>/`, typed, with a timeout and a **fixture mode** when the key is empty (fixtures in `src/lib/<service>/fixtures/`).
- Leads are written to Supabase before any external call. Each external delivery (Plektan, Telegram) has its own status column + error + attempts; failed ones are retried by the cron.
- Cron endpoints check `CRON_SECRET`.
- Never log secrets or full personal data.

## Diagrams
- A slice that changes a table, a data driver, a service client or one of the flows drawn in `docs/diagrams.md` updates that diagram and its «Blocks» row, runs `pnpm diagrams` and commits both `docs/diagrams.md` and `docs/diagrams.html`.
- Every block has a `real` / `mock` / `seam` marker and a one-sentence «What it is» of at most 140 characters (it is the tooltip); the same block keeps the same name and sentence in every diagram.
- A test fails when `docs/diagrams.html` is out of step with `docs/diagrams.md`.

## Styling
- Only Tailwind utilities from the tokens in `src/app/globals.css`. No raw colors, px values or inline styles. New tokens go there first.
- `cn()` from `@/lib/utils`, `cva` for variants.
- Mobile-first. Prices use `tabular-nums`.
- No `cursor-pointer` on native controls (it comes from the base layer); add it only to custom clickable elements.

## Copy and locale
- UI copy is Ukrainian, written for ordinary people, not for IT. Dates and numbers via `Intl` with `uk-UA`.
- Plektan is called with `lang=uk`.

## Accessibility
- WCAG 2.1 AA contrast, visible focus, labels on all inputs (`<Label htmlFor>` + `useId`).
- Touch targets ≥ 44px; icon-only buttons have `aria-label`; gallery works with keyboard and swipe.
- Form results and errors are announced (`role="status"` / `role="alert"`).

## Performance budget
Checked with `pnpm perf` (needs `pnpm build`; mobile 375px, 4x CPU throttle, fast 4G; median of 3 warm runs; fails on a non-localhost request). Routes: `/`, `/catalog`, a property page.
- LCP < 2.5 s, CLS < 0.1.
- First-load JS (script tags in the HTML, gzip) does not grow: now ~220 KB gz on `/`, ~216 KB on `/catalog`, ~226 KB on a property page. A change that adds more than ~5 KB gz to a route needs a reason in the spec.
- Client components import only light modules: no `zod`, no server-side data modules. Put constants / enums that forms and stores need in a `*-values.ts` file and keep the zod schemas in a separate file.
- The first-screen photo has `fetchPriority="high"` and the right `sizes`; photos below the fold are lazy; the assistant panel is loaded on demand; loading skeletons are at least one viewport tall so the footer does not jump.

## States (every screen)
Loading (skeleton) · empty (explanation + next action) · error (message + retry) · long values (truncate with title or wrap) · many items (pagination) · missing photo (placeholder).
