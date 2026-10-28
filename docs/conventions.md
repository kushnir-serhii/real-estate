# Conventions

Every slice is checked against these rules. If a rule gets in the way, raise it in the spec's open questions instead of breaking it quietly.

## Stack (don't add libraries without asking)
Next.js (App Router) · React · TypeScript (strict) · Tailwind 4 · shadcn/ui (Radix) · lucide-react · zod · `@supabase/supabase-js` + `@supabase/ssr` · `@opennextjs/cloudflare` (+ wrangler) · `@aws-sdk/client-s3` for R2 (or the R2 binding) · Playwright (UI check only). Versions are fixed in spec 001.

## Files and folders
**Every file and folder name is `kebab-case`.** Next.js reserved files keep their names (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `sitemap.ts`, `robots.ts`).

| What | Where | Inside |
| --- | --- | --- |
| Route | `src/app/(site)/catalog/[slug]/page.tsx` | `const PropertyPage = async (…) => …` + `export default` |
| Admin route | `src/app/admin/…` | same; protected by the admin layout + middleware |
| API / cron / webhooks | `src/app/api/<name>/route.ts` | |
| Server actions | `src/features/<domain>/actions.ts` | `'use server'` at the top |
| Component | `src/features/<domain>/property-card.tsx` | `export const PropertyCard = …` |
| Shared UI | `src/components/layout/`, `src/components/` | |
| shadcn primitive | `src/components/ui/button.tsx` | as the CLI generated it |
| Data access | `src/lib/db/<domain>.ts` | `getPublishedProperties(…)` |
| External client | `src/lib/plektan/`, `src/lib/telegram/`, `src/lib/r2/`, `src/lib/turnstile/`, `src/lib/geocode/`, `src/lib/llm/` | |
| Supabase clients | `src/lib/supabase/server.ts`, `client.ts`, `admin.ts` | |
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
- Three clients: `server.ts` (anon key + user session, for pages and actions), `client.ts` (browser, anon key), `admin.ts` (service role — server only, sync and admin actions; `import 'server-only'`).
- Every table has RLS in the migration that creates it. Public read only of published properties and their photos; leads have no public read; writes from the site only via server code.
- Prices: integer amount + `currency` (`UAH` | `USD` | `EUR`). Format only through `formatPrice` (locale `uk-UA`). Keep the Plektan raw text in `raw` for debugging.
- Keep Plektan's original payload (`raw jsonb`) and ids (`external_id` = `adid`) on synced rows; our own `id` is a uuid.
- Slugs are stable once published (they're in Google's index).

## Integrations
- One client per service in `src/lib/<service>/`, typed, with a timeout and a **fixture mode** when the key is empty (fixtures in `src/lib/<service>/fixtures/`).
- Leads are written to Supabase before any external call. Each external delivery (Plektan, Telegram) has its own status column + error + attempts; failed ones are retried by the cron.
- Cron endpoints check `CRON_SECRET`.
- Never log secrets or full personal data.

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

## States (every screen)
Loading (skeleton) · empty (explanation + next action) · error (message + retry) · long values (truncate with title or wrap) · many items (pagination) · missing photo (placeholder).
