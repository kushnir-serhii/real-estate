# Starting a new project from the template

The repo is a working demo for the fictional agency **Diplomat Hall** (Kyiv) on mock data. To turn it into a site for a real agency, go through these steps in order. Nothing here needs searching the code: every place is listed.

## 1. Brand and contacts

Edit the constants (all text is Ukrainian, all values are mock):

| File | What to change |
| --- | --- |
| `src/constants/brand.ts` | `BRAND.name`, `tagline`, `siteTitle`, `siteDescription`; `OG_DEFAULT_IMAGE` |
| `src/constants/contacts.ts` | phone (`display` + `href`), email, address, hours, map coordinates, messengers, socials |
| `src/constants/home.ts` | hero lead text and image |
| `src/constants/pages.ts` | built-in texts of «Головна», «Про агентство», «Контакти», «Політика конфіденційності» (shown while the `pages` row is empty) |
| `src/constants/assistant.ts` | assistant name, role, greeting, FAQ and rules |
| `src/app/admin/layout.tsx` | admin page titles (`Адмінка …`) |
| `wrangler.jsonc`, `supabase/config.toml` | worker name, local Supabase `project_id` |
| `src/lib/geocode/client.ts` | the geocoder `User-Agent` (`DiplomatHallSync`) |
| `.env.example` / production env | `NEXT_PUBLIC_SITE_URL` (the real domain) |

Storage keys (`diplomat-hall-theme`, `diplomat-hall:favorites`, `diplomat-hall:assistant-chat`) live in `src/lib/theme.ts`, `src/features/favorites/favorites-store.ts`, `src/features/assistant/chat-storage.ts`. Rename them if you want a new prefix. Visitors of a live site lose their saved favourites and theme unless the old prefix goes into `LEGACY_STORAGE_PREFIXES` (`src/lib/legacy-storage.ts`, newest first): the stores move old values to the new keys once. On a new project with no visitors yet, delete that file and the migration branches.

## 2. Colours and tokens

All colours are tokens in `src/app/globals.css`; components never hardcode them. The brand accent is the `--primary` family (`--primary`, `--primary-foreground`, `--secondary*`, `--accent*`, `--ring`), in `:root` (light) and `.dark`. The Midnight Sky palette uses a sky blue (hue 240–245 in oklch). To re-colour, change these tokens only, then check contrast (WCAG AA):

- text on primary buttons (`--primary-foreground` on `--primary`): at least 4.5:1;
- accent text and links (`--primary` on `--background`): at least 4.5:1;
- focus ring (`--ring` on `--background`): at least 3:1.

Do it in both themes. The `/design` page shows the tokens.

## 3. Logo, favicon, social image

1. Replace the mark: `public/brand/diplomat-hall-shield.svg` (the reference, stroke-only, `currentColor`) and the same paths in `src/components/layout/shield-mark.tsx` (inline, so it follows the theme). `src/components/layout/logo.tsx` builds the lockup: mark + 1px rule + the two-line wordmark in `font-logo` (Cormorant SC, `src/app/fonts/cormorant-sc.ts`); sizes and proportions are the `logo-*` utilities in `globals.css`. Variants `full` / `mark`; below 360px only the mark shows in the header.
2. Favicon and social image: the shield paths, colours and tagline sit at the top of `scripts/generate-brand-assets.mjs`; run `node scripts/generate-brand-assets.mjs` (uses `sharp`, no network). It writes `src/app/icon.svg` (heavier strokes so it reads at 16px; hex colours because SVG files can't use CSS tokens), `src/app/favicon.ico` and `public/og-default.png` (1200×630). The OG wordmark uses a system serif (sharp can't load the web font).

## 4. Mock data

The demo runs on in-memory data from `src/lib/demo/seed/` (`properties.ts`, `photos.ts`, `agents.ts`, `pages.ts`, `leads.ts`). Edit or replace these files: listings (keep addresses, prices and descriptions consistent), agents (phones, `@example.com` emails), page texts, leads. Photos are in `public/placeholders/`. The data layer picks the source with `DATA_DRIVER` (`demo` by default without Supabase env, `supabase` for the real database).

## 5. Connect real services

In this order (details and steps: `docs/setup.md`):

1. **Supabase** (database, auth, RLS). Then set `DATA_DRIVER=supabase`, apply migrations, create the first admin.
2. **Cloudflare** (Workers deploy, R2 for photos) and `NEXT_PUBLIC_SITE_URL`.
3. **Turnstile** (spam check on lead forms).
4. **Telegram bot** (new-lead alerts to the manager).
5. **Plektan** (listing sync and lead channel), only if the agency uses it. The site works without it.
6. **LLM key** (real assistant instead of the scripted fixture).

Before going live, replace the demo seed (`src/lib/demo/seed/`; `supabase/seed.sql` is generated from it with `pnpm seed:sql`, run it after editing the seed) and the demo texts with real ones, and read the checklist in `docs/setup.md`.
