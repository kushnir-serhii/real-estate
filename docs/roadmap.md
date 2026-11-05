# Roadmap

The single source of truth for what is done, what is next, and in which order. `/run-implement` (`/run-impl`) reads this file. The process behind it is in [process.md](process.md).

Stage 1 (≈7–9 weeks): base site + admin + AI assistant — see [reference/stack.md](reference/stack.md) → «Ціни й терміни».

## Status

| # | Spec | Status | Depends on |
| --- | --- | --- | --- |
| 001 | [Scaffold: Next.js on Cloudflare](specs/001-scaffold.md) | done | — |
| 002 | [Data model (Supabase)](specs/002-data-model.md) | done | 001 |
| 003 | [Plektan sync](specs/003-plektan-sync.md) | done | 002 |
| 004 | [Site shell + static pages](specs/004-site-shell.md) | done | 001 |
| 005 | [Catalog + property page](specs/005-catalog.md) | done | 002, 004 |
| 006 | [Leads: forms → Supabase → Plektan → Telegram](specs/006-leads.md) | done | 002, 004 |
| 007 | [Admin: sign-in + leads](specs/007-admin-leads.md) | done | 002, 006 |
| 008 | [Admin: properties + photos](specs/008-admin-properties.md) | done | 003, 007 |
| 009 | [SEO](specs/009-seo.md) | done | 005, 007 |
| 010 | [AI assistant](specs/010-ai-assistant.md) | done | 005, 006 |
| 011 | [Demo mode: a local-first template](specs/011-demo-template.md) | done | 010 |
| 012 | [Premium redesign: Midnight Sky](specs/012-premium-redesign.md) | done | 011 |
| 013 | [Public pages render without JavaScript](specs/013-no-js-rendering.md) | done | 012 |
| 014 | [Styled selects and the team on «Про нас»](specs/014-selects-and-team.md) | in-progress | 013 |

Statuses: `draft` → `ready` → `in-progress` → `done` (meaning in [process.md](process.md#statuses)). The status here and in the spec's header must match.

## Plan

Read top to bottom; the next spec is the first one that isn't `done`. Specs in one wave don't depend on each other and can run in parallel; otherwise they are built in the listed order.

| Wave | Specs (in order) |
| --- | --- |
| 1 | 001 |
| 2 | 002, 004 |
| 3 | 003, 005, 006 |
| 4 | 007 |
| 5 | 008, 009 |
| 6 | 010 |
| 7 | 011 |
| 8 | 012 |
| 9 | 013 |
| 10 | 014 |

- To change the order, edit this table.
- To make a spec buildable, review it and set it to `ready` here and in the spec.
- New spec: copy [specs/_template.md](specs/_template.md), take the next number, add a row to **Status** and put it in a wave.

## Later (stage 2+, not specced)
Blog, reviews; client login (Telegram / Google), saved searches + Telegram alerts, price-drop alerts, XML feed to LUN, simple lead pipeline in the admin. See [reference/stack.md](reference/stack.md) → «Можливий функціонал».
