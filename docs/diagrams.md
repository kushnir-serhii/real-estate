# UML diagrams

Diagrams of how the **7 SKY** real estate project is built around Supabase and Plektan, and where the mock data lives. They are written in [Mermaid](https://mermaid.js.org/) (GitHub and the VS Code Markdown preview render it) and describe the code **as of spec 015**. Product context: [product.md](product.md).

This file is the single source. `docs/diagrams.html` is generated from it: a self-contained viewer (no network, opens by double-click) where hovering or focusing any block shows a small tooltip with its marker and a short description. Elsewhere, for example on GitHub, the same text is in the «Blocks» table under each diagram.

## Legend

Every block carries one marker, written as text in its label (never by colour alone) and in the «Data» column of its table.

| Marker | Meaning |
| --- | --- |
| `real` | The production path: Supabase Postgres with RLS, Supabase Auth, R2, the live Plektan, Telegram, LLM, Turnstile and geocoder calls. Wired in code, **not connected to any account yet**. |
| `mock` | Exists only for demo or fixture mode: the in-memory store, the typed seed, the demo session cookie, in-memory photo uploads, service fixtures, the agency constants and the generated `supabase/seed.sql`. |
| `seam` | Code that serves both worlds and picks one by env: the `src/lib/db/*` facades, each service client's entry, `admin-session.ts` and `photo-url.ts`. |

A dash in the «Data» column means the block holds no data (a person or a trigger). In the diagrams a `mock` block has a dashed border and a dotted arrow leads to it.

## Blocks tables

Under every diagram there is a table with one row per block:

| Column | Content |
| --- | --- |
| `Block` | The key that matches the block in the Mermaid source: the node id in a flowchart, the class name in a class diagram, the participant or actor alias in a sequence diagram, the state id in a state diagram. |
| `Data` | `real`, `mock`, `seam` or a dash. |
| `What it is` | One plain sentence of at most 140 characters. It is the tooltip text. |
| `Code` | The path in the repo and the env variable that switches the block, if any. Shown in the table only. |

`pnpm diagrams` fails when a block has no row, when a row matches no block, or when a sentence is longer than 140 characters.

## Regenerating the viewer

```sh
pnpm diagrams
```

The generator reads this file, renders each diagram with Mermaid in the Playwright Chromium (offline, nothing is downloaded), checks the tables against the diagrams and writes `docs/diagrams.html`, which is committed. Edit this file, run the command, commit both files.

## 1. System context

Who uses the system, what it is made of, and, next to every `real` block, its `mock` twin; the env variable that picks each side is on the arrow or in the block. With no env at all the app runs on the mock side: that is the demo.

```mermaid
flowchart LR
    visitor(["Visitor"])
    manager(["Manager"])
    admin(["Admin"])

    cron["Scheduled workflow<br/>GitHub Actions<br/>[real]"]
    cronnoop["Sync no-op in demo<br/>[mock]"]

    app["Next.js app<br/>Cloudflare Workers via OpenNext<br/>[seam]"]
    consts["Agency constants<br/>src/constants<br/>[mock]"]

    facade["Data facades<br/>src/lib/db<br/>[seam]"]
    adminsession["admin-session.ts<br/>[seam]"]
    photourl["photo-url.ts<br/>[seam]"]
    clients["Service clients<br/>plektan, telegram, llm,<br/>turnstile, geocode<br/>[seam]"]

    subgraph sb["Supabase"]
        pg["Postgres with RLS<br/>[real]"]
        auth["Supabase Auth<br/>[real]"]
    end
    store["Demo store and seed<br/>in memory<br/>[mock]"]
    seedsql["Generated seed.sql<br/>[mock]"]
    session["Demo session cookie<br/>[mock]"]
    r2["Cloudflare R2<br/>photo bucket<br/>[real]"]
    photos["In-memory photo uploads<br/>[mock]"]

    subgraph ext["External services"]
        plektan["Plektan CRM API<br/>PLEKTAN_API_KEY<br/>[real]"]
        plektanfx["Plektan fixtures<br/>PLEKTAN_FIXTURE_SET<br/>PLEKTAN_LEADS_FIXTURE<br/>[mock]"]
        telegram["Telegram Bot API<br/>TELEGRAM_BOT_TOKEN<br/>[real]"]
        telegramfx["Telegram fixture<br/>TELEGRAM_FIXTURE<br/>[mock]"]
        llm["LLM API<br/>LLM_API_KEY<br/>[real]"]
        llmfx["Scripted assistant<br/>[mock]"]
        turnstile["Cloudflare Turnstile<br/>TURNSTILE_SECRET_KEY<br/>[real]"]
        turnstilefx["Turnstile pass-through<br/>[mock]"]
        geocoder["Nominatim geocoder<br/>GEOCODER_CONTACT_EMAIL<br/>[real]"]
        geocoderfx["Geocoder fixture<br/>[mock]"]
    end

    visitor --> app
    admin --> app
    cron -->|"POST /api/cron, pnpm sync"| app
    cron -.->|"DATA_DRIVER=demo"| cronnoop
    app -.-> consts
    app --> facade
    app --> adminsession
    app --> photourl
    app --> clients

    facade -->|"DATA_DRIVER=supabase"| pg
    facade -.->|"DATA_DRIVER=demo"| store
    store -.->|"pnpm seed:sql"| seedsql
    adminsession -->|"supabase driver"| auth
    adminsession -.->|"DATA_DRIVER=demo"| session
    photourl -->|"NEXT_PUBLIC_R2_PUBLIC_URL"| r2
    photourl -.->|"demo-uploads keys"| photos

    clients -->|"key set"| plektan
    clients -.->|"no key"| plektanfx
    clients -->|"token set"| telegram
    clients -.->|"fixture set"| telegramfx
    clients -->|"key set"| llm
    clients -.->|"no key"| llmfx
    clients -->|"secret set"| turnstile
    clients -.->|"no secret"| turnstilefx
    clients -->|"email set"| geocoder
    clients -.->|"no email"| geocoderfx
    telegram --> manager

    classDef real fill:#dbeafe,stroke:#1d4ed8,color:#0b1f4d
    classDef mock fill:#fef3c7,stroke:#b45309,color:#3b2300,stroke-dasharray:5 4
    classDef seam fill:#ede9fe,stroke:#6d28d9,color:#2a1065
    classDef person fill:#f3f4f6,stroke:#4b5563,color:#111827

    class pg,auth,r2,plektan,telegram,llm,turnstile,geocoder,cron real
    class consts,store,seedsql,session,photos,plektanfx,telegramfx,llmfx,turnstilefx,geocoderfx,cronnoop mock
    class app,facade,adminsession,photourl,clients seam
    class visitor,manager,admin person
```

| Block | Data | What it is | Code |
| --- | --- | --- | --- |
| `visitor` | — | A person browsing the catalog, using the favourites, the lead forms and the AI assistant. | `src/app/(site)` |
| `manager` | — | An agency manager who receives a Telegram message for every new lead. | — |
| `admin` | — | An agency admin who manages properties, photos, leads, pages, posts and settings. | `src/app/admin` |
| `app` | seam | The one Next.js app on Cloudflare Workers that serves the site, the admin and the API, and picks each backend by env. | `src/app`, `wrangler.jsonc` |
| `consts` | mock | The demo agency's name, contacts, texts and navigation, kept as constants until a real agency's data replaces them. | `src/constants/*` |
| `facade` | seam | The only data entry point for pages and actions: it adds caching and picks the Supabase or the demo driver. | `src/lib/db/*`, `DATA_DRIVER` in `src/lib/data-driver.ts` |
| `pg` | real | Supabase Postgres with row-level security: the production store of properties, photos, leads, pages, posts and AI chats. | `src/lib/db/supabase/*`, `supabase/migrations/` |
| `auth` | real | Supabase Auth with email and password; an admin is a user listed in the admins table. | `src/lib/supabase/{server,client,admin}.ts` |
| `store` | mock | The typed seed loaded into memory per process, with the same read and write rules that RLS applies in Postgres. | `src/lib/demo/store.ts`, `src/lib/demo/seed/*`, `src/lib/demo/db/*` |
| `seedsql` | mock | The SQL file generated from the demo seed so a local Supabase can start with the same listings. | `supabase/seed.sql`, `pnpm seed:sql` |
| `adminsession` | seam | Answers who is calling the admin: a Supabase Auth user checked against admins, or the signed demo cookie. | `src/lib/auth/admin-session.ts` |
| `session` | mock | A signed httpOnly cookie behind the one-click demo sign-in, with no account or network call. | `src/lib/demo/session.ts`, `DEMO_SESSION_SECRET` |
| `photourl` | seam | Turns a stored photo key into a URL: R2, an in-memory demo upload, or a local placeholder file. | `src/lib/photos/photo-url.ts`, `NEXT_PUBLIC_R2_PUBLIC_URL` |
| `r2` | real | Cloudflare R2 holds property, agent and post photos in two or three sizes; the Worker binding or the S3 API writes them. | `src/lib/r2/client.ts`, `R2_*`, `PHOTOS_BUCKET` |
| `photos` | mock | Photos uploaded in the demo admin, kept in memory and served by a demo route; the limit is set by an env variable. | `src/lib/demo/photos.ts`, `DEMO_UPLOAD_MAX_MB` |
| `clients` | seam | One small client per external service; each picks the live API or its fixture from env on every call. | `src/lib/{plektan,telegram,llm,turnstile,geocode}/` |
| `plektan` | real | The Plektan CRM API: the source of synced properties and agents, and the target of the leads that we send back. | `src/lib/plektan/client.ts`, `PLEKTAN_API_KEY` |
| `plektanfx` | mock | Canned Plektan answers and canned lead results, so sync and lead delivery run locally without a key. | `src/lib/plektan/fixtures/*`, `PLEKTAN_FIXTURE_SET`, `PLEKTAN_LEADS_FIXTURE` |
| `telegram` | real | The Telegram bot that sends each new lead to the managers' chat. | `src/lib/telegram/client.ts`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MANAGER_CHAT_ID` |
| `telegramfx` | mock | A fixture that logs the message instead of sending it, or fails on purpose to test the retry. | `src/lib/telegram/client.ts`, `TELEGRAM_FIXTURE` |
| `llm` | real | The OpenAI chat API that powers the property assistant. | `src/lib/llm/client.ts`, `LLM_API_KEY`, `LLM_MODEL` |
| `llmfx` | mock | A scripted assistant that answers without any model, used when there is no API key. | `src/lib/llm/fixtures/*` |
| `turnstile` | real | Cloudflare Turnstile checks that a lead form was filled in by a person. | `src/lib/turnstile/verify.ts`, `TURNSTILE_SECRET_KEY` |
| `turnstilefx` | mock | With an empty secret every token passes, so forms work locally without the widget keys. | `src/lib/turnstile/verify.ts` |
| `geocoder` | real | The Nominatim geocoder that finds coordinates for synced properties that arrive without them. | `src/lib/geocode/client.ts`, `GEOCODER_CONTACT_EMAIL` |
| `geocoderfx` | mock | A fixture that returns fixed coordinates for known addresses and never touches the network. | `src/lib/geocode/fixture.ts` |
| `cron` | real | A scheduled GitHub Actions workflow that runs the Plektan sync and calls the lead retry and cleanup routes. | `.github/workflows/sync.yml`, `CRON_SECRET`, `src/app/api/cron/*` |
| `cronnoop` | mock | In demo mode the sync script prints a notice and exits, because the store already holds the seed listings. | `scripts/sync.ts`, `DATA_DRIVER=demo` |
