-- Spec 009 slice 2: a static page can be kept out of search engines (and the sitemap).
-- RLS is unchanged: `pages` stays publicly readable and server-written (policy in leads_pages_settings).
alter table public.pages
  add column noindex boolean not null default false;
