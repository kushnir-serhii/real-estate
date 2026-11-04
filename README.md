# 7 SKY: real estate website + admin (demo template)

A complete real estate site for a fictional agency in Kyiv, **7 SKY**: catalog with filters, property pages, lead forms, a scripted AI assistant, and an admin (leads, properties and photos, pages, SEO). It runs on mock data, so you can clone it and use every feature with **no Docker, no accounts, no keys and no network**. The same code connects to the real stack (Supabase, Cloudflare R2, Plektan CRM, Telegram, an LLM) by configuration. UI language: Ukrainian.

Stack: Next.js (App Router, TypeScript) · Tailwind 4 · shadcn/ui · deployed to Cloudflare Workers (OpenNext).

## Quickstart

```sh
pnpm install
pnpm dev
```

Open <http://localhost:3000>. There is no `.env.local` to create.

- **Admin:** open `/admin/sign-in` and press «Увійти як демо-адміністратор». One click, no password.
- **Data:** typed mock data held in memory. It resets when the server restarts, or with «Скинути демо-дані» in the admin banner.
- **Photos:** uploads in the admin work and stay in memory (2 MB per photo, 40 MB total by default).
- Forms, the AI assistant, Plektan, Telegram and Turnstile run in their fixture modes while their keys are empty.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server (demo mode unless Supabase is configured) |
| `pnpm build` / `pnpm start` | Production build and server; the demo build needs no env |
| `pnpm typecheck` / `pnpm lint` | TypeScript and ESLint |
| `pnpm test` | Vitest: unit and data-driver contract tests |
| `pnpm ui-check` | Playwright UI check at 375 and 1280 px, fails on console errors and non-localhost requests (see [docs/process.md](docs/process.md)) |
| `pnpm perf` | Speed baseline on a local production build: LCP, CLS, JS size |
| `pnpm seed:sql` | Regenerates `supabase/seed.sql` from `src/lib/demo/seed/` |
| `pnpm preview` | Build for Cloudflare (OpenNext) and run in workerd locally (on Windows needs symlink rights or WSL) |
| `pnpm deploy` | Build and deploy to Cloudflare (needs your account) |
| `pnpm sync` / `pnpm sync:check` | Plektan sync / its local check; in demo mode they print a notice and exit 0 |
| `pnpm db:types` | Regenerates the Supabase types (needs a local Supabase) |

A local Supabase (Docker) is optional: only to test the `supabase` driver (`DATA_DRIVER=supabase`).

## Make it yours

- Start a new project from this template: [docs/template.md](docs/template.md) (brand, colours, mock data, services).
- Leave demo mode and connect the real accounts: [docs/setup.md](docs/setup.md).
- Product, process and conventions: [docs/README.md](docs/README.md).
