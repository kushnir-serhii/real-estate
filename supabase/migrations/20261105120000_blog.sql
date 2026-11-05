-- Spec 015 slice 1: the blog. `posts` (Markdown body, fixed category list) and `post_properties` (up to 3
-- related properties per post, ordered by position). The public reads published posts only; every write goes
-- through the service role (admin actions), so there are no write policies.

-- posts ------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  -- Stable once the post has been published (it is in Google's index); enforced by the admin code.
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  -- Markdown produced by the admin editor; rendered by the site's safe Markdown renderer.
  body text not null default '',
  -- Keep in sync with BLOG_CATEGORIES in src/constants/blog.ts.
  category text not null check (category in ('buyers', 'sellers', 'rent', 'market', 'tips')),
  tags text[] not null default '{}',
  cover_key text,
  cover_alt text,
  author_agent_id uuid references public.agents (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Set on the first publish and kept afterwards.
  published_at timestamptz,
  seo_title text,
  seo_description text,
  noindex boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger posts_set_updated_at before update on public.posts
  for each row execute function public.set_updated_at();

create index posts_published_idx on public.posts (status, published_at desc);
create index posts_category_idx on public.posts (category, published_at desc);
create index posts_author_agent_id_idx on public.posts (author_agent_id);

-- post_properties: related properties (max 3 per post, enforced in the app) -------
create table public.post_properties (
  post_id uuid not null references public.posts (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  position smallint not null check (position between 0 and 2),
  primary key (post_id, property_id),
  unique (post_id, position)
);

create index post_properties_property_id_idx on public.post_properties (property_id);

-- RLS: public read of published posts and their links; no write policies ---------
alter table public.posts enable row level security;
alter table public.post_properties enable row level security;

create policy "public reads published posts" on public.posts
  for select to anon, authenticated
  using (status = 'published');

create policy "public reads links of published posts" on public.post_properties
  for select to anon, authenticated
  using (exists (
    select 1 from public.posts p
    where p.id = post_properties.post_id and p.status = 'published'
  ));
