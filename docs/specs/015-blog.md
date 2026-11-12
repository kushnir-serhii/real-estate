# 015 — Blog

**Status:** done · **Depends on:** 014 · **Route(s):** `/blog`, `/blog/[slug]`, `/`, `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]`

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

### [x] 1. Data: posts tables, drivers, demo seed
- **Build:** migration with RLS, `database.types.ts` updated, `src/constants/blog.ts` (categories, page size), public + admin facades and both drivers, demo store + 8 published + 1 draft seed posts, `pnpm seed:sql`, driver contract tests, `docs/setup.md` migration line.
- **Files:** `supabase/migrations/*_blog.sql`, `src/lib/supabase/database.types.ts`, `src/constants/blog.ts`, `src/lib/db/{posts,admin-posts,driver-types,cache-tags}.ts`, `src/lib/db/supabase/{posts,admin-posts}.ts`, `src/lib/demo/db/{posts,admin-posts}.ts`, `src/lib/demo/{store.ts,seed/posts.ts,seed/index.ts,seed/sql.ts}`, `supabase/seed.sql`, contract tests, `docs/setup.md`
- **Agent:** backend · **Model:** sonnet
- **Accept:**
  - [x] both tables have RLS; anon sees only published posts and their links (contract test on demo; on Supabase when a local DB is up)
  - [x] demo driver hides drafts from public reads, returns copies
  - [x] `pnpm test` green including seed drift; typecheck, lint, build green

### [x] 2. Public blog: list and post pages, menu
- **Build:** `/blog` (cards: cover, category, title, excerpt, date; category chips in the URL `?category=`; pagination `?page=`), `/blog/[slug]` (article layout, Markdown body via the existing renderer with article typography, author card, related properties as property cards, CTA), `loading.tsx` / `error.tsx` / `not-found`, empty states, missing cover placeholder. «Блог» in header, mobile menu, footer. Works without JS.
- **Files:** `src/app/(site)/blog/**`, `src/features/blog/*`, `src/components/layout/{nav-config,site-footer}.ts(x)`, `e2e/no-js.spec.ts`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] list, filter, pagination and post page at 375 and 1280, both themes, without JS
  - [x] draft slug → 404; unknown category → all posts (or canonical redirect)
  - [x] states: loading, empty (no posts / none in category), error with retry, long titles, missing cover
  - [x] first-load JS on `/blog/[slug]` within the budget of a property page; no TipTap on public routes

### [x] 3. SEO and «Останні статті» on home
- **Build:** `generateMetadata` for list and post (canonical, OG, `noindex`), `BlogPosting` + `BreadcrumbList` JSON-LD, posts in `sitemap.ts`, the home block with the 3 latest posts.
- **Files:** `src/features/seo/{schemas,sitemap-entries}.ts` (+ tests), `src/app/sitemap.ts`, `src/app/(site)/blog/**`, `src/features/home/home-blog.tsx`, `src/app/(site)/page.tsx`, `src/constants/home.ts`
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [x] sitemap lists published, indexable posts with `lastModified`; drafts and `noindex` posts absent (unit test)
  - [x] JSON-LD valid shape (unit test); canonical drops `page=1`
  - [x] home block shows 3 latest, hidden when none / on error

### [x] 4. Admin: posts list and editor
- **Build:** `/admin/blog` list (status chips, category, date, search, pagination, empty state), `/admin/blog/new` and `/admin/blog/[id]`: title, slug (auto from title, locked once published), category, tags, excerpt, TipTap editor (headings, bold / italic, lists, quote, link) saving Markdown, author (agent), SEO fields with the existing SERP preview / length hints, draft / publish, delete with confirm. Server actions with zod, `requireAdmin()`, `revalidateTag`. «Блог» in the admin nav.
- **Files:** `src/app/admin/(panel)/blog/**`, `src/features/admin/blog/*`, `src/features/admin/admin-nav.ts`, `package.json` (TipTap)
- **Agent:** designer (+ backend for actions) · **Model:** sonnet
- **Accept:**
  - [x] create → draft not public; publish → appears on `/blog`, home and sitemap; unpublish / delete → gone
  - [x] editor works with keyboard, toolbar buttons have labels, 44px targets, 375 and 1280
  - [x] Markdown round-trip: what the editor saves renders the same on the site (unit test on sample content)
  - [x] TipTap only in admin chunks

### [x] 5. Admin: cover and related properties
- **Build:** cover upload / replace / remove with alt text (existing photo pipeline, WebP sizes; demo in memory), related properties picker (search published properties, up to 3, order).
- **Files:** `src/features/admin/blog/*`, `src/lib/db/admin-posts.ts` + drivers, `src/lib/photos/*`
- **Agent:** backend + designer · **Model:** sonnet
- **Accept:**
  - [x] cover shows on list, post, home block and OG; replacing deletes the old object
  - [x] picker saves up to 3 properties; hidden / unpublished properties are not shown on the post

## External needs
- Migration `*_blog.sql` to apply to Supabase (user).
- New dependencies (admin only): `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/markdown` `^3.32.3`.

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
  - Publishing (not saving a draft) requires a non-empty excerpt and body; checked in the slice 4 action.
- **Decided (slice 2):** no route-level `loading.tsx` for the blog (same reason as 013: with JS off the streamed fallback never swaps; `NavProgress` covers client navigation). The post CTA links to `/contacts#zv-yazok` with phone + messengers (no form JS on articles). Unknown category → all posts with canonical `/blog`; a page past the last → empty state (same as the catalog). Covers render in a fixed 16:9 box; add `srcSet` if slice 5 stores WebP sizes.
- **Note (slice 4):** field errors stay visible until the next submit (same as the other admin forms). Editor typography (`POST_EDITOR_PROSE`) mirrors `src/features/pages/markdown.tsx` by hand, and the client `LIMITS` mirror `POST_LIMITS` (zod stays out of the client); keep them in sync. Once seen: the home page stayed stale right after a delete (an ISR regeneration in flight), not reproduced; worst case up to `revalidate` (5 min).
- **Note (slice 5):** one cover size is stored (widest resized WebP, ≤1600px, `posts/<postId>/<token>-<w>.webp`), so `BlogCover` has no `srcSet` and the admin list thumbnail loads that file (lazy). Several sizes would need a `cover_sizes` column or a key convention: a follow-up if covers get heavy. Cover and related properties are added after the first draft save (they need a post id). The picker lists published properties only; the public post filters non-published ones anyway.
- **Note (slice 1):** `database.types.ts` was hand-edited (no local Supabase running) — regenerate with `pnpm db:types` when a local DB is up. The slug locks once `published_at` is set (unpublishing does not unlock it). On Supabase `setPostProperties` is delete + insert (not one transaction). Slice 4 actions must `revalidateTag(postTag(slug))` besides `posts`.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-11-05 | 1 | done: migration `20261105120000_blog.sql` (`posts` with category / status checks, `set_updated_at` trigger, listing indexes; `post_properties` position 0..2; RLS: public selects published posts and their links only, no write policies); `database.types.ts` hand-edited; `src/constants/blog.ts`; public facade `posts.ts` (+ `post-query.ts`), admin facade `admin-posts.ts` (discriminated results, slug lock, first-publish `published_at`, ≤3 related, cover returns the old key), `post-schemas.ts`, `post-slug.ts` (reuses `slugifyBase`); both drivers; related properties via `fetchPropertiesByIds`, published only; seed 8 published + 1 draft (covers `placeholders/*.webp`, one without), `seed.sql` regenerated; contract + seed tests: 676 passed / 56 skipped (Supabase run skipped, no local DB) | `supabase/migrations/20261105120000_blog.sql`, `src/lib/supabase/database.types.ts`, `src/constants/blog.ts`, `src/lib/db/{posts,admin-posts,post-query,post-schemas,post-slug,driver-types,cache-tags}.ts`, `src/lib/db/{supabase,../demo/db}/{posts,admin-posts}.ts`, `src/lib/demo/{store.ts,seed/*}`, `supabase/seed.sql`, `docs/setup.md` |
| 2026-11-05 | 2 | done: `/blog` (cards, category chips as links with `aria-current`, `?page=` pagination reusing catalog `pageItems`, empty / none-in-category / out-of-range states, load error alert + retry), `/blog/[slug]` (breadcrumbs, category chip, date + reading time, cover `fetchPriority=high` in a 16:9 box, Markdown body ~68ch, tag chips, author card, CTA, related property cards), `error.tsx`, `not-found.tsx`; «Блог» in `NAV_LINKS` (header, mobile menu, footer), `NavLink` prefix match; Markdown renderer gained `ol` / `blockquote` / `em` styles (also on about / privacy). `e2e/no-js.spec.ts` 33/33 on `next start`; post page ships fewer chunks than a property page (+~1.9 KB gz blog-only chunks); screenshots reviewed (list 1280 dark, post 375 light) | `src/app/(site)/blog/**`, `src/features/blog/*`, `src/constants/blog.ts`, `src/components/layout/{nav-config,nav-link}.ts(x)`, `src/features/pages/markdown.tsx`, `src/features/catalog/catalog-pagination.tsx`, `e2e/no-js.spec.ts` |
| 2026-11-05 | 3 | done: `generateMetadata` for `/blog` (category title, canonical keeps `category`, drops `page=1`, invalid category → `/blog`) and posts (`seo_title` / `seo_description || excerpt` trimmed to 155, canonical, OG `article` with times + absolute cover / default image, `noindex` → robots); `blogPostingSchema` + `BLOG_CRUMB` JSON-LD; sitemap adds `/blog`, 5 category URLs and published non-noindex posts (`lastModified = updated_at`; both drivers filter `noindex`), falls back to `[]` on error; `HomeBlog` (3 latest, after agents, hidden when none / on error). Tests 684 passed; no-JS e2e 34/34 | `src/features/seo/{schemas,sitemap-entries}.ts` (+ tests), `src/app/sitemap.ts`, `src/features/blog/{blog-seo,blog-post-view}.ts(x)`, `src/app/(site)/blog/**`, `src/features/home/home-blog.tsx`, `src/app/(site)/page.tsx`, `src/constants/home.ts`, `e2e/no-js.spec.ts` |
| 2026-11-05 | 4 | done: `/admin/blog` (search, status, category in the URL, pagination, empty / filtered states, skeleton, error), `/admin/blog/new`, `/admin/blog/[id]` (title, slug auto while new, editable until first publish then read-only, category, author incl. «Без автора», tags, excerpt, TipTap → Markdown in a hidden input via `next/dynamic` `ssr:false`, toolbar 10 buttons with `aria-label` / `aria-pressed` 44px, inline link bar `http(s)` / `/` / `mailto` / `tel`, SEO + SERP preview, noindex, publish / draft, delete with dialog); actions with zod + `requireAdmin()`, publish needs excerpt + body; `revalidate-post.ts`; «Блог» in the admin nav. Review fix: `requireAdmin()` in `PostsResults` before the service-role list. Round-trip test identical Markdown + same site HTML; no `tiptap` / `prosemirror` in scripts of `/`, `/blog`, a post, `/catalog`. Playwright on demo: draft hidden; publish → `/blog`, home, sitemap; unpublish / delete → gone. Tests 700 passed | `src/app/admin/(panel)/blog/**`, `src/features/admin/blog/*`, `src/features/admin/admin-nav.ts`, `src/lib/db/revalidate-post.ts`, `package.json`, `pnpm-lock.yaml` |
| 2026-11-05 | 5 | done: «Обкладинка» on the edit page (spec 008 client resize → WebP, `POST /api/admin/post-covers` with `requireAdmin()`, type / size checks; replace / remove delete the old object, seed `placeholders/*` never touched; alt required, defaults to the title), post delete also deletes its cover (storage failure logged, never fails the delete), admin list thumbnail; «Об'єкти до статті» picker (debounced search of published properties via `getAdminProperties`, add, up / down, remove, max 3, hidden badge), server actions with zod + `requireAdmin()`, revalidation. Playwright on demo: cover on `/blog`, post, home, `og:image`; old object 404 after replace; 3 related in order; hidden property gone from the post. Tests 700 passed | `src/app/api/admin/post-covers/route.ts`, `src/lib/photos/{post-cover-storage,photo-upload}.ts`, `src/features/admin/blog/*`, `src/app/admin/(panel)/blog/[id]/page.tsx` |
| 2026-11-05 | UI check | `SPEC=015 ROUTES=root,blog,blog?category=rent,blog?page=2,<2 posts> pnpm ui-check`: 58/58 (incl. no-JS) on `next start :3199` (a dev server held :3000, and Next 16 refuses a second `next dev` in the same dir). Screenshots reviewed; fix: category chips wrap on mobile (the active chip was clipped in the scroller). Also fixed a flaky `session.test.ts` (tampering the last base64url char could decode to the same bytes) | `src/features/blog/blog-category-chips.tsx`, `src/lib/demo/session.test.ts` |
