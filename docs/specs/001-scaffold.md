# 001 — Scaffold: Next.js on Cloudflare

**Status:** in-progress · **Depends on:** — · **Route(s):** `/`

## Goal
An empty Next.js app that builds, lints, previews in the Cloudflare runtime and has the tooling every later spec relies on (tokens, shadcn, Supabase clients, UI check).

## Scope
- In: app at the repo root, pnpm, TypeScript strict, ESLint, Tailwind 4 + shadcn/ui + tokens, OpenNext for Cloudflare, Supabase clients + local Supabase folder, Playwright UI check, `.env.example`.
- Out: real pages (004), schema (002), any remote account setup.

## Data
None. `supabase/` initialized (config + empty migrations).

## Slices

### [x] 1. Next.js app + tooling
- **Build:** `create-next-app` in a temp folder, then move into the root (it refuses a non-empty folder; keep our `.gitignore` and merge any new entries) (App Router, TS, Tailwind, ESLint, `src/`, `@/` alias, pnpm). Versions: Next 16.4.x, React 19, Tailwind 4, `@opennextjs/cloudflare` 1.20.x (supports `next >=16.4.1`); exact versions recorded in the Log. Scripts `dev`, `build`, `typecheck` (`tsc --noEmit`), `lint` (`eslint .`). Strict TS (+ `noUnusedLocals`, `noUnusedParameters`). Pin `packageManager` (`pnpm@10.28.2`). Placeholder home page.
- **Files:** `package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `src/app/**`
- **Agent:** backend
- **Accept:**
  - [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` green
  - [x] existing `.gitignore`, `.env.example`, `CLAUDE.md`, `docs/` untouched

### [ ] 2. Tokens + shadcn
- **Build:** `shadcn init`; tokens (colors, radius, spacing, fonts with Cyrillic) in `src/app/globals.css`; `cn()`; base layer with pointer cursor for native controls; button, input, label, card added. Placeholder look: shadcn neutral palette + one calm accent; font chosen by the designer for the niche and current trends (good Cyrillic, tabular numbers, via `next/font`) — all swapped later via tokens only. **Light + dark** themes: tokens for both, following the system preference plus a theme switch (no flash on load). A `/design` page showing tokens and primitives in both themes (noindex).
- **Files:** `src/app/globals.css`, `src/components/ui/*`, `src/lib/utils.ts`, `src/app/design/page.tsx`
- **Agent:** designer
- **Accept:**
  - [ ] no raw colors outside `globals.css`
  - [ ] `/design` renders at 375px without horizontal scroll
  - [ ] light and dark both meet WCAG AA contrast; theme switch works without a flash of the wrong theme

### [ ] 3. Cloudflare (OpenNext)
- **Build:** `@opennextjs/cloudflare` + `wrangler.jsonc`; worker name `lyndrik-web`; scripts `preview` (build + run in workerd) and `deploy` (used by the user only, never run by agents). `.dev.vars` documented in `.env.example`.
- **Files:** `wrangler.jsonc`, `open-next.config.ts`, `package.json`
- **Agent:** backend
- **Accept:**
  - [ ] `pnpm preview` serves the home page locally in workerd (if it can't run on native Windows, the criterion is reported as blocked, not worked around)
  - [ ] no deploy was run

### [ ] 4. Supabase clients
- **Build:** `@supabase/ssr` clients `server.ts`, `client.ts`, `admin.ts` (`server-only`); session refresh in `src/proxy.ts` (Next 16) if OpenNext supports it, otherwise `src/middleware.ts`, matching only `/admin/:path*` (public pages stay static; no visitor sessions in stage 1); `supabase` CLI as a devDependency; `supabase init`; `db:types` script generating `database.types.ts` from the local DB (local Supabase in Docker; generated once now from the empty schema).
- **Files:** `src/lib/supabase/*`, `src/proxy.ts` or `src/middleware.ts`, `supabase/config.toml`, `package.json`
- **Agent:** backend
- **Accept:**
  - [ ] importing `admin.ts` from a client component fails the build
  - [ ] build green with empty env (no crash at import time)

### [ ] 5. Playwright UI check
- **Build:** port `ui-check` from `doc-spread/apps/web` (`playwright.config.ts`, `e2e/ui-check.spec.ts`): `next dev` on port 3199, `SPEC`/`ROUTES` env, 375/1280 viewports, light + dark themes, Chromium only, fail on console errors and horizontal scroll, screenshots to `e2e/screenshots/<spec>/`.
- **Files:** `playwright.config.ts`, `e2e/ui-check.spec.ts`, `package.json`
- **Model:** haiku
- **Accept:**
  - [ ] `SPEC=001 ROUTES=root,design pnpm ui-check` passes and writes screenshots

## External needs
- None for local work. Later: Cloudflare account + Supabase project on the client (see stack.md → Відкриті питання).

## Open questions
- ~~Light only, or light + dark?~~ **Decided 2026-10-28:** light + dark; the UI check runs both themes.
- ~~Fonts / colors?~~ **Decided 2026-10-28:** no design yet — neutral placeholder palette + one accent; the font is the designer's pick for the niche and current trends (answer in the 001 questions round, replacing the earlier "Inter"); the real design replaces the tokens later.
- Image resizing to WebP sizes: `sharp` can't run in Workers. Options: resize in the sync job running in Node (GitHub Actions), Cloudflare Images, or a Workers image library. **Decided 2026-10-28:** decide in 003.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-28 | 1 | done | next 16.4.3, react 19.3.0, typescript 5.9.3, tailwindcss 4.3.3, eslint 9.39.5, pnpm 10.28.2. Template's `cacheComponents`/`partialPrefetching` dropped (conflict with ISR + `revalidateTag`). `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `src/app/*`, `.gitignore` (+2 entries) |
