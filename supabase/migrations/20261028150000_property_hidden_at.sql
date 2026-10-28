-- Spec 005, slice 3: a hidden property stays readable by the public for 7 days (the "sold" page),
-- then it becomes a 404. The 7-day window is a product decision (spec 005); in code it is SOLD_PAGE_DAYS
-- in src/lib/db/properties.ts. Keep both in sync.

alter table public.properties add column hidden_at timestamptz;

create or replace function public.set_property_hidden_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'hidden' and new.hidden_at is null then
      new.hidden_at = now();
    elsif new.status = 'published' then
      new.hidden_at = null;
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'hidden' then
      new.hidden_at = now();
    else
      new.hidden_at = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger properties_set_hidden_at before insert or update of status on public.properties
  for each row execute function public.set_property_hidden_at();

-- Backfill without bumping updated_at (it is the value we copy).
alter table public.properties disable trigger properties_set_updated_at;
update public.properties set hidden_at = updated_at where status = 'hidden' and hidden_at is null;
alter table public.properties enable trigger properties_set_updated_at;

create index properties_hidden_at_idx on public.properties (hidden_at) where status = 'hidden';

-- RLS: published, or hidden less than 7 days ago.
drop policy "public reads published properties" on public.properties;
create policy "public reads published or recently hidden properties" on public.properties
  for select to anon, authenticated
  using (
    status = 'published'
    or (status = 'hidden' and hidden_at > now() - interval '7 days')
  );

drop policy "public reads photos of published properties" on public.property_photos;
create policy "public reads photos of visible properties" on public.property_photos
  for select to anon, authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_photos.property_id
      and (p.status = 'published' or (p.status = 'hidden' and p.hidden_at > now() - interval '7 days'))
  ));

-- Column grant (raw and house stay revoked). The photos policy above reads hidden_at as its own subquery.
grant select (hidden_at) on public.properties to anon, authenticated;
