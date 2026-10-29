-- Spec 009 slice 3: the «Чернетка» notice on a static page (privacy policy) becomes a per-page setting
-- edited in /admin/pages instead of a code constant. RLS is unchanged: `pages` stays publicly readable
-- and server-written (policy in leads_pages_settings).
alter table public.pages
  add column is_draft boolean not null default false;
