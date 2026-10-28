# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`real-estate` is the website + admin for the real estate agency **Lyndrik** (Ukraine). One Next.js app at the repo root (no monorepo), deployed to Cloudflare. Product and architecture: `docs/product.md`. Original working notes (Ukrainian): `docs/reference/stack.md`, Plektan CRM API: `docs/reference/plektan-api.md`.

The repo starts empty: spec 001 scaffolds the app. Until it's `done`, the commands below don't exist yet.

## Commands (after spec 001)

Use pnpm.

```sh
pnpm install
pnpm dev          # next dev
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm build        # next build
pnpm preview      # build for Cloudflare (OpenNext) and run in workerd locally
pnpm ui-check     # Playwright UI check, see docs/process.md → step 8
```

Database: Supabase migrations live in `supabase/migrations/`. Agents write migrations and regenerate types; they never run anything against the remote (production) Supabase, Cloudflare or Plektan accounts — applying migrations and deploying is the user's job.

## Architecture notes

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
- `docs/specs/`: one spec per task, split into slices (`_template.md` for new ones).

`/run-implement` (short: `/run-impl`) runs one step of the loop in `docs/process.md`. Key rules: before any code the agent reads the main docs, pins down the spec's purpose and aims, and asks all questions for the whole spec once, up front (a `draft` spec is moved to `ready` in that same round, after the user approves); then its slices run one after another without stopping (each verified and committed on the spec's branch) and are reported once at the end; Opus orchestrates, Sonnet implements (`designer` for UI, `backend` for data/sync/integrations), Haiku takes mechanical work; the user merges branches into `main` (PRs).
