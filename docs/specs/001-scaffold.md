# 001 — Scaffold: Next.js on Cloudflare

**Status:** draft · **Depends on:** — · **Route(s):** `/`

## Goal
An empty Next.js app that builds, lints, previews in the Cloudflare runtime and has the tooling every later spec relies on (tokens, shadcn, Supabase clients, UI check).

## Scope
- In: app at the repo root, pnpm, TypeScript strict, ESLint, Tailwind 4 + shadcn/ui + tokens, OpenNext for Cloudflare, Supabase clients + local Supabase folder, Playwright UI check, `.env.example`.
- Out: real pages (004), schema (002), any remote account setup.

## Data
None. `supabase/` initialized (config + empty migrations).

## Slices

### [ ] 1. Next.js app + tooling
- **Build:** `create-next-app` in a temp folder, then move into the root (it refuses a non-empty folder; keep our `.gitignore` and merge any new entries) (App Router, TS, Tailwind, ESLint, `src/`, `@/` alias, pnpm). Scripts `dev`, `build`, `typecheck` (`tsc --noEmit`), `lint`. Strict TS (+ `noUnusedLocals`, `noUnusedParameters`). Pin `packageManager`. Placeholder home page.
- **Files:** `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `src/app/**`
- **Agent:** backend
- **Accept:**
  - [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` green
  - [ ] existing `.gitignore`, `.env.example`, `CLAUDE.md`, `docs/` untouched

### [ ] 2. Tokens + shadcn
- **Build:** `shadcn init`; tokens (colors, radius, spacing, fonts with Cyrillic) in `src/app/globals.css`; `cn()`; base layer with pointer cursor for native controls; button, input, label, card added. A `/design` page showing tokens and primitives (noindex).
- **Files:** `src/app/globals.css`, `src/components/ui/*`, `src/lib/utils.ts`, `src/app/design/page.tsx`
- **Agent:** designer
- **Accept:**
  - [ ] no raw colors outside `globals.css`
  - [ ] `/design` renders at 375px without horizontal scroll

### [ ] 3. Cloudflare (OpenNext)
- **Build:** `@opennextjs/cloudflare` + `wrangler.jsonc`; scripts `preview` (build + run in workerd) and `deploy` (used by the user only). `.dev.vars` documented in `.env.example`.
- **Files:** `wrangler.jsonc`, `open-next.config.ts`, `package.json`
- **Agent:** backend
- **Accept:**
  - [ ] `pnpm preview` serves the home page locally in workerd
  - [ ] no deploy was run

### [ ] 4. Supabase clients
- **Build:** `@supabase/ssr` clients `server.ts`, `client.ts`, `admin.ts` (`server-only`); middleware refreshing the session; `supabase init`; `db:types` script generating `database.types.ts` from the local DB.
- **Files:** `src/lib/supabase/*`, `src/middleware.ts`, `supabase/config.toml`, `package.json`
- **Agent:** backend
- **Accept:**
  - [ ] importing `admin.ts` from a client component fails the build
  - [ ] build green with empty env (no crash at import time)

### [ ] 5. Playwright UI check
- **Build:** port `ui-check` from `doc-spread/apps/web` (`playwright.config.ts`, `e2e/ui-check.spec.ts`): `next dev` on port 3199, `SPEC`/`ROUTES` env, 375/1280 viewports, fail on console errors and horizontal scroll, screenshots to `e2e/screenshots/<spec>/`.
- **Files:** `playwright.config.ts`, `e2e/ui-check.spec.ts`, `package.json`
- **Model:** haiku
- **Accept:**
  - [ ] `SPEC=001 ROUTES=root,design pnpm ui-check` passes and writes screenshots

## External needs
- None for local work. Later: Cloudflare account + Supabase project on the client (see stack.md → Відкриті питання).

## Open questions
- Light only, or light + dark? (Recommended: light only for a public real estate site; the UI check then runs one theme.)
- Fonts: which Cyrillic family (e.g. Inter / Manrope / Onest)? A designer decision.
- Image resizing to WebP sizes: `sharp` can't run in Workers. Options: resize in the sync job running in Node (GitHub Actions), Cloudflare Images, or a Workers image library. Decide here or in 003.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
