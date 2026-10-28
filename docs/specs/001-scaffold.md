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

### [x] 2. Tokens + shadcn
- **Build:** `shadcn init`; tokens (colors, radius, spacing, fonts with Cyrillic) in `src/app/globals.css`; `cn()`; base layer with pointer cursor for native controls; button, input, label, card added. Placeholder look: shadcn neutral palette + one calm accent; font chosen by the designer for the niche and current trends (good Cyrillic, tabular numbers, via `next/font`) — all swapped later via tokens only. **Light + dark** themes: tokens for both, following the system preference plus a theme switch (no flash on load). A `/design` page showing tokens and primitives in both themes (noindex).
- **Files:** `src/app/globals.css`, `src/components/ui/*`, `src/lib/utils.ts`, `src/app/design/page.tsx`
- **Agent:** designer
- **Accept:**
  - [x] no raw colors outside `globals.css`
  - [x] `/design` renders at 375px without horizontal scroll
  - [x] light and dark both meet WCAG AA contrast; theme switch works without a flash of the wrong theme

### [ ] 3. Cloudflare (OpenNext)
- **Build:** `@opennextjs/cloudflare` + `wrangler.jsonc`; worker name `lyndrik-web`; scripts `preview` (build + run in workerd) and `deploy` (used by the user only, never run by agents). `.dev.vars` documented in `.env.example`.
- **Files:** `wrangler.jsonc`, `open-next.config.ts`, `package.json`
- **Agent:** backend
- **Accept:**
  - [ ] `pnpm preview` serves the home page locally in workerd (if it can't run on native Windows, the criterion is reported as blocked, not worked around)
  - [x] no deploy was run

### [x] 4. Supabase clients
- **Build:** `@supabase/ssr` clients `server.ts`, `client.ts`, `admin.ts` (`server-only`); session refresh in `src/proxy.ts` (Next 16) if OpenNext supports it, otherwise `src/middleware.ts`, matching only `/admin/:path*` (public pages stay static; no visitor sessions in stage 1); `supabase` CLI as a devDependency; `supabase init`; `db:types` script generating `database.types.ts` from the local DB (local Supabase in Docker; generated once now from the empty schema).
- **Files:** `src/lib/supabase/*`, `src/proxy.ts` or `src/middleware.ts`, `supabase/config.toml`, `package.json`
- **Agent:** backend
- **Accept:**
  - [x] importing `admin.ts` from a client component fails the build
  - [x] build green with empty env (no crash at import time)

### [x] 5. Playwright UI check
- **Build:** port `ui-check` from `doc-spread/apps/web` (`playwright.config.ts`, `e2e/ui-check.spec.ts`): `next dev` on port 3199, `SPEC`/`ROUTES` env, 375/1280 viewports, light + dark themes, Chromium only, fail on console errors and horizontal scroll, screenshots to `e2e/screenshots/<spec>/`.
- **Files:** `playwright.config.ts`, `e2e/ui-check.spec.ts`, `package.json`
- **Model:** haiku
- **Accept:**
  - [x] `SPEC=001 ROUTES=root,design pnpm ui-check` passes and writes screenshots

## External needs
- **`pnpm preview` on this Windows machine:** the OpenNext build fails with `EPERM: operation not permitted, symlink` (`copyTracedFiles`, `@opennextjs/aws` 4.1.12). Enable Windows Developer Mode (lets non-admin users create symlinks) or run preview in WSL/Linux CI, then re-run `pnpm preview` to close slice 3.
- None for local work. Later: Cloudflare account + Supabase project on the client (see stack.md → Відкриті питання).

## Open questions
- `src/middleware.ts` (edge) instead of Next 16 `src/proxy.ts`: OpenNext 1.20 bundles Node-runtime proxy only experimentally (unsupported). `next build` warns that `middleware` is deprecated. Switch to `proxy.ts` once OpenNext supports it.
- `supabase` CLI pinned at 2.98.0: installing 2.122.0 crashed pnpm with a heap OOM. Retry an upgrade later.
- ~~Light only, or light + dark?~~ **Decided 2026-10-28:** light + dark; the UI check runs both themes.
- ~~Fonts / colors?~~ **Decided 2026-10-28:** no design yet — neutral placeholder palette + one accent; the font is the designer's pick for the niche and current trends (answer in the 001 questions round, replacing the earlier "Inter"); the real design replaces the tokens later.
- Image resizing to WebP sizes: `sharp` can't run in Workers. Options: resize in the sync job running in Node (GitHub Actions), Cloudflare Images, or a Workers image library. **Decided 2026-10-28:** decide in 003.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-28 | 1 | done | next 16.4.3, react 19.3.0, typescript 5.9.3, tailwindcss 4.3.3, eslint 9.39.5, pnpm 10.28.2. Template's `cacheComponents`/`partialPrefetching` dropped (conflict with ISR + `revalidateTag`). `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `src/app/*`, `.gitignore` (+2 entries) |
| 2026-10-28 | 2 | built; 375px pending UI check (step 8) | Font Manrope (latin+cyrillic, `--font-sans`); accent deep teal; light+dark via inline head script + `lyndrik-theme` localStorage + `ThemeToggle`; AA ratios computed (lowest: control outline 4.3, focus ring 4.6). Added `--control` token (shadcn `--input` too faint). shadcn CLI wrote `cn` npm import — replaced with `@/lib/utils`. Deps: radix-ui, cva, clsx, tailwind-merge, lucide-react, tw-animate-css; `shadcn` (dev, for its CSS). `components.json`, `globals.css`, `layout.tsx`, `design/page.tsx`, `lib/utils.ts`, `lib/theme.ts`, `components/theme-toggle.tsx`, `components/ui/*` |
| 2026-10-28 | 3 | built; preview **blocked** (Windows symlink EPERM in OpenNext build) | `@opennextjs/cloudflare` 1.20.13, wrangler 4.154.0; `wrangler.jsonc` (`lyndrik-web`, compat 2026-10-01, `nodejs_compat`), `open-next.config.ts`, `next.config.ts` (`initOpenNextCloudflareForDev`), scripts `preview`/`deploy`/`cf-typegen`, `pnpm-workspace.yaml` (`onlyBuiltDependencies: workerd, esbuild`), eslint ignores, `.env.example` comment; `cloudflare-env.d.ts` git-ignored (regenerate with `pnpm cf-typegen`). No deploy run. |
| 2026-10-28 | 4 | done | `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118.0, zod 4.6.7, server-only, supabase CLI 2.98.0 (dev). `src/lib/supabase/{env,server,client,admin,middleware,database.types}.ts`, `src/middleware.ts` (matcher `/admin/:path*`, pass-through with empty env), `supabase/config.toml` (`project_id = "lyndrik"`), `supabase/migrations/.gitkeep`, `db:types` script; types generated from local Supabase (empty schema). Leak test: build fails with the `server-only` error. |
| 2026-10-28 | 5 | done | `@playwright/test` 1.64.1, `playwright.config.ts` (next dev :3199, Chromium), `e2e/ui-check.spec.ts` (375/1280 × light/dark), `ui-check` script. `AGENTS.md` committed (written by `next dev`, re-created if removed). |
| 2026-10-28 | UI check | 8/8 passed | `root`, `design` × mobile/desktop × light/dark; screenshots reviewed: both themes, Cyrillic (ґ ї є), tabular prices, no overflow. Closes slice 2's 375px criterion. Spec stays `in-progress` until slice 3's preview runs. |
