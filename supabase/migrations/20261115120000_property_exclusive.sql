-- Spec 021 slice 4: an «exclusive» flag on a property, set in the admin (the Plektan sync never writes it).
-- The home page shows flagged properties first in its «Ексклюзивні пропозиції» collection.
-- RLS is already on for public.properties and its policies are unchanged. The public column grant is an explicit
-- list (migration hide_private_property_columns), so the new column has to be granted for the public read to see it.
alter table public.properties
  add column is_exclusive boolean not null default false;

grant select (is_exclusive) on public.properties to anon, authenticated;

-- Published exclusive rows, newest first (the home collection).
create index properties_exclusive_published_idx
  on public.properties (published_at desc)
  where is_exclusive and status = 'published';
