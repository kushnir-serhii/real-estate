# 013 — Public pages render without JavaScript

**Status:** ready · **Depends on:** 012 · **Route(s):** every public route (`/`, `/catalog`, `/catalog/[slug]`, `/about`, `/contacts`, `/favorites`, `/privacy`, 404)

## Goal
With JavaScript disabled (or before it loads, or for crawlers that don't run it), every public page shows its real content. Today the prerendered HTML puts the page body into a hidden Suspense segment (`<div hidden id="S:0">`) that an inline script reveals, so without JS the page body is empty. That hurts SEO robustness, accessibility and the "premium, solid" impression for a template being sold.

## Scope
- In:
  - Find every route-level and component-level Suspense boundary that hides already-rendered content in the HTML (`src/app/(site)/loading.tsx` added in 011 slice 6, `catalog/loading.tsx`, `catalog/[slug]` loading, home `Suspense` around featured / agents, contacts agents).
  - Restructure so the main content of each public page is in the visible HTML: e.g. drop route-level `loading.tsx` where the page is static / ISR, keep skeletons only for genuinely slow parts, or move them down to sections so the shell and the main content stream visible. Client-side navigation must still give feedback (skeleton or a light top progress indicator in CSS, no new library).
  - Keep the 011 slice 6 CLS fix intent: no layout jump while loading (CLS < 0.1).
  - A UI-check (or test) that fetches each public route's HTML and asserts the main heading and key content are not inside a `hidden` element / `<template>`.
- Out:
  - Making interactive features work without JS (favorites, gallery swipe, assistant, theme toggle) beyond what already works (forms that post, links).
  - Admin routes.

## Data
No data changes.

## Slices

### [ ] 1. Visible HTML on every public route
- **Build:** investigate how Next 16 emits the hidden segment for prerendered and dynamic routes; restructure loading boundaries as above; client-navigation feedback kept; a check in `e2e/` (runs in `pnpm ui-check`) or a vitest over a built server that fails if `h1` or the main list/content is hidden in the raw HTML of `/`, `/catalog`, a property page, `/about`, `/contacts`, `/privacy`, `/favorites` (empty-state shell), 404.
- **Files:** `src/app/(site)/**/loading.tsx`, `src/app/(site)/**/page.tsx`, Suspense call sites in `src/features/*`, `e2e/*`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] with JS disabled in Playwright, each route above shows its `h1` and main content (screenshot reviewed)
  - [ ] client-side navigation between catalog pages still shows loading feedback
  - [ ] `pnpm perf`: LCP < 2.5 s, CLS < 0.1 on `/`, `/catalog`, a property page; first-load JS doesn't grow
  - [ ] typecheck, lint, test, build green

## External needs
None.

## Open questions
- **Decided (2026-11-05):** the user asked for this as its own spec after 012.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
