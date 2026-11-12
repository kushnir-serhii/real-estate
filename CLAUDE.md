# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`real-estate` is the website + admin for the real estate agency **7 SKY** (a fictional demo agency in Ukraine; the repo doubles as a template for a real project). One Next.js app at the repo root (no monorepo), deployed to Cloudflare. Product and architecture: `docs/product.md`. Original working notes (Ukrainian): `docs/reference/stack.md`, Plektan CRM API: `docs/reference/plektan-api.md`.

## Talking to the user

Talk to the user in Ukrainian: all replies, reports, summaries and questions (in chat and in `AskUserQuestion`: question, options, descriptions). Code, commits and docs stay in English.

## Commands

Use pnpm. **Docker isn't needed:** a fresh clone runs on the demo driver (mock data in memory) with no `.env.local`, no keys and no network. A local Supabase (Docker) is only for testing the `supabase` driver.

```sh
pnpm install
pnpm dev          # next dev
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm build        # next build (the demo build needs no env)
pnpm test         # vitest: unit + driver contract tests (the Supabase run is skipped when no local DB)
pnpm perf         # speed baseline on a local production build (LCP, CLS, JS), see docs/conventions.md
pnpm seed:sql     # regenerate supabase/seed.sql from src/lib/demo/seed (a test fails on drift)
pnpm diagrams     # regenerate docs/diagrams.html from docs/diagrams.md (a test fails on drift)
pnpm preview      # build for Cloudflare (OpenNext) and run in workerd locally
pnpm ui-check     # Playwright UI check, see docs/process.md → step 8
```

Database (only for the `supabase` driver): Supabase migrations live in `supabase/migrations/`. Agents write migrations and regenerate types; they never run anything against the remote (production) Supabase, Cloudflare or Plektan accounts — applying migrations and deploying is the user's job.

## Architecture notes

- **Two data drivers** (`DATA_DRIVER=demo|supabase`; empty = `supabase` if its env is set, else `demo`): `supabase` is Postgres + RLS + R2; `demo` is typed mock data in memory (`src/lib/demo/`, seed in `src/lib/demo/seed/`) with a one-click demo admin sign-in and in-memory photo uploads. Callers import the facades in `src/lib/db/` and never branch on the driver. `supabase/seed.sql` is generated from the demo seed. Leaving demo mode: `docs/setup.md`.
- **The site is the foundation, the CRM is optional.** Properties, photos, leads and clients live in Supabase + R2. Plektan is an external source and a channel to portals, never the store. Everything must keep working if Plektan is switched off.
- **One source of truth for properties at a time:** Plektan sync *or* the admin. Never both (duplicates).
- Flows: Plektan → cron sync (`after_date`) → Supabase + photos to R2 → site. Leads: form / AI → Supabase **first** → Plektan `addAdvert` → Telegram to the manager. A failed Plektan or Telegram call never loses a lead.
- Secrets only on the server. RLS: the public sees only published properties; leads are admin-only.
- External services (Plektan, Telegram, LLM, geocoder) sit behind small clients in `src/lib/<service>/` with a fixture mode, so everything runs locally without keys.

## Specs and process

All process documents live in `docs/`:

- `docs/product.md`: what the product is, users, data flows, screens, design principles, technical frame.
- `docs/roadmap.md`: status of every spec and the build plan (waves, order). The single source of truth for what's next.
- `docs/process.md`: statuses, what a slice is, models and delegation, the loop, Definition of Done.
- `docs/conventions.md`: the rules every slice is checked against.
- `docs/diagrams.md`: UML diagrams of the Supabase / Plektan architecture with the mock data marked (`real` / `mock` / `seam`); viewer with tooltips: `docs/diagrams.html` (generated, `pnpm diagrams`).
- `docs/specs/`: one spec per task, split into slices (`_template.md` for new ones).

`/run-implement` (short: `/run-impl`) runs one step of the loop in `docs/process.md`. Key rules: before any code the agent reads the main docs, pins down the spec's purpose and aims, and asks all questions for the whole spec once, up front (a `draft` spec is moved to `ready` in that same round, after the user approves); then its slices run one after another without stopping (each verified and committed on the spec's branch, which is created from the previous spec's branch, not from `main`) and are reported once at the end; Opus orchestrates, Sonnet implements (`designer` for UI, `backend` for data/sync/integrations), Haiku takes mechanical work; the user merges branches into `main` (PRs).
