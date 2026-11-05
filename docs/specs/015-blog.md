# 015 — Blog

**Status:** ready · **Depends on:** 014 · **Route(s):** `/blog`, `/blog/[slug]`, `/`, `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]`

## Goal
The agency can publish useful articles (buying, selling, renting, the market) that bring search traffic and trust, and lead readers to the catalog and the request form. When this is done, visitors read posts at `/blog`, filter them by category, see related properties under a post; the admin writes posts in a visual editor, uploads a cover, saves drafts and publishes.

## Scope
- In:
  - Public: `/blog` (list of published posts, newest first, category filter in the URL, pagination), `/blog/[slug]` (cover, title, category, date, reading time, author, body, related properties, CTA to the request form, breadcrumbs).
  - «Блог» in the header nav, mobile menu and footer; «Останні статті» block on `/` (3 latest, hidden when none).
  - SEO: per-post title / description (fallbacks from title / excerpt), canonical, OG image = cover, `BlogPosting` + `BreadcrumbList` JSON-LD, published posts in the sitemap, drafts never public (404), per-post `noindex` switch.
  - Admin «Блог»: list (status, category, date, search), create / edit with a visual TipTap editor, draft / published, cover upload, category, tags, related properties picker, SEO fields, delete (with confirm). Admin edits revalidate the public pages.
  - Data: `posts` + `post_properties` tables with RLS (migration), both drivers, demo seed posts, `supabase/seed.sql` regenerated.
- Out:
  - Comments, likes, newsletter / RSS, scheduled publishing, revisions history, multiple authors with their own logins, inline images inside the body (see Open questions), Plektan (posts never go to Plektan).

## Data
- Migration `supabase/migrations/<ts>_blog.sql`:
  - `posts`: `id uuid pk`, `slug text unique` (stable once published), `title`, `excerpt`, `body` (Markdown produced by the editor), `category` (text, one of a fixed list in `src/constants/blog.ts`, check constraint), `tags text[]`, `cover_key` / `cover_alt` (R2 key, nullable), `author_agent_id` (fk `agents`, nullable), `status` (`draft` | `published`), `published_at`, `seo_title`, `seo_description`, `noindex bool`, `created_at`, `updated_at`.
  - `post_properties`: `post_id`, `property_id`, `position` (≤ 3 per post).
  - RLS: public reads only `status = 'published'` posts and their links; writes only via service role (admin actions).
- Facades: `src/lib/db/posts.ts` (public: `getPublishedPosts({ category, page })`, `getPostBySlug`, `getLatestPosts(n)`, `getSitemapPosts`), `src/lib/db/admin-posts.ts` (list, get, create, update, delete, set related properties, cover). Both drivers + cases in the driver contract tests. Cache tags `posts`, `post:<slug>`.
- Cover photos through the existing photo pipeline (R2 in `supabase` mode, in-memory uploads in demo), WebP sizes like property photos.
- Demo seed: 8 published posts + 1 draft in Ukrainian across the categories, covers from the existing seed photos, related properties from the seed.

## Slices

### [ ] 1. Data: posts tables, drivers, demo seed
- **Build:** migration with RLS, `database.types.ts` updated, `src/constants/blog.ts` (categories, page size), public + admin facades and both drivers, demo store + 8 published + 1 draft seed posts, `pnpm seed:sql`, driver contract tests, `docs/setup.md` migration line.
- **Files:** `supabase/migrations/*_blog.sql`, `src/lib/supabase/database.types.ts`, `src/constants/blog.ts`, `src/lib/db/{posts,admin-posts,driver-types,cache-tags}.ts`, `src/lib/db/supabase/{posts,admin-posts}.ts`, `src/lib/demo/db/{posts,admin-posts}.ts`, `src/lib/demo/{store.ts,seed/posts.ts,seed/index.ts,seed/sql.ts}`, `supabase/seed.sql`, contract tests, `docs/setup.md`
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [ ] both tables have RLS; anon sees only published posts and their links (contract test on demo; on Supabase when a local DB is up)
  - [ ] demo driver hides drafts from public reads, returns copies
  - [ ] `pnpm test` green including seed drift; typecheck, lint, build green

### [ ] 2. Public blog: list and post pages, menu
- **Build:** `/blog` (cards: cover, category, title, excerpt, date; category chips in the URL `?category=`; pagination `?page=`), `/blog/[slug]` (article layout, Markdown body via the existing renderer with article typography, author card, related properties as property cards, CTA), `loading.tsx` / `error.tsx` / `not-found`, empty states, missing cover placeholder. «Блог» in header, mobile menu, footer. Works without JS.
- **Files:** `src/app/(site)/blog/**`, `src/features/blog/*`, `src/components/layout/{nav-config,site-footer}.ts(x)`, `e2e/no-js.spec.ts`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] list, filter, pagination and post page at 375 and 1280, both themes, without JS
  - [ ] draft slug → 404; unknown category → all posts (or canonical redirect)
  - [ ] states: loading, empty (no posts / none in category), error with retry, long titles, missing cover
  - [ ] first-load JS on `/blog/[slug]` within the budget of a property page; no TipTap on public routes

### [ ] 3. SEO and «Останні статті» on home
- **Build:** `generateMetadata` for list and post (canonical, OG, `noindex`), `BlogPosting` + `BreadcrumbList` JSON-LD, posts in `sitemap.ts`, the home block with the 3 latest posts.
- **Files:** `src/features/seo/{schemas,sitemap-entries}.ts` (+ tests), `src/app/sitemap.ts`, `src/app/(site)/blog/**`, `src/features/home/home-blog.tsx`, `src/app/(site)/page.tsx`, `src/constants/home.ts`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] sitemap lists published, indexable posts with `lastModified`; drafts and `noindex` posts absent (unit test)
  - [ ] JSON-LD valid shape (unit test); canonical drops `page=1`
  - [ ] home block shows 3 latest, hidden when none / on error

### [ ] 4. Admin: posts list and editor
- **Build:** `/admin/blog` list (status chips, category, date, search, pagination, empty state), `/admin/blog/new` and `/admin/blog/[id]`: title, slug (auto from title, locked once published), category, tags, excerpt, TipTap editor (headings, bold / italic, lists, quote, link) saving Markdown, author (agent), SEO fields with the existing SERP preview / length hints, draft / publish, delete with confirm. Server actions with zod, `requireAdmin()`, `revalidateTag`. «Блог» in the admin nav.
- **Files:** `src/app/admin/(panel)/blog/**`, `src/features/admin/blog/*`, `src/features/admin/admin-nav.ts`, `package.json` (TipTap)
- **Agent:** designer (+ backend for actions) · **Model:** sonnet
- **Accept:**
  - [ ] create → draft not public; publish → appears on `/blog`, home and sitemap; unpublish / delete → gone
  - [ ] editor works with keyboard, toolbar buttons have labels, 44px targets, 375 and 1280
  - [ ] Markdown round-trip: what the editor saves renders the same on the site (unit test on sample content)
  - [ ] TipTap only in admin chunks

### [ ] 5. Admin: cover and related properties
- **Build:** cover upload / replace / remove with alt text (existing photo pipeline, WebP sizes; demo in memory), related properties picker (search published properties, up to 3, order).
- **Files:** `src/features/admin/blog/*`, `src/lib/db/admin-posts.ts` + drivers, `src/lib/photos/*`
- **Agent:** backend + designer · **Model:** sonnet
- **Accept:**
  - [ ] cover shows on list, post, home block and OG; replacing deletes the old object
  - [ ] picker saves up to 3 properties; hidden / unpublished properties are not shown on the post

## External needs
- Migration `*_blog.sql` to apply to Supabase (user).
- New dependencies: TipTap packages (admin only).

## Open questions
- **Decided (2026-11-05):**
  - Body is stored as **Markdown**: TipTap in the admin reads / writes Markdown (`@tiptap/markdown`); the site renders it with the existing safe Markdown renderer (`src/features/pages/markdown.tsx`). No HTML in the DB, no sanitizer, no new public JS.
  - **Categories:** one per post from a fixed list in `src/constants/blog.ts` (`buyers` «Покупцям», `sellers` «Продавцям», `rent` «Оренда», `market` «Ринок», `tips` «Поради»); free `tags` are shown on the post, not filterable.
  - **Category URL:** `/blog?category=<key>` (indexable, canonical keeps `category`, drops `page=1`), pagination `?page=`, 6 posts per page.
  - **Body content:** headings, bold / italic, lists, quotes, links; **no inline images** (only the cover). Related properties: up to 3, picked by hand in the admin.
  - **Author:** optional agent from `agents` (photo, name, phone on the post); none → «Команда 7 SKY» (brand const).
  - **Demo seed:** 8 published posts (2 pages) + 1 draft, all categories.
  - **Placement:** header / mobile menu / footer «Купити · Орендувати · Про нас · Блог · Контакти»; home block «Останні статті» after the agents section, before testimonials.
  - Slug generated from the title (transliterated), editable while draft, locked once published. TipTap is a new dependency, admin only.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
