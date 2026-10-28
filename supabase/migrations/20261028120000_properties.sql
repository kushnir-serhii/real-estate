-- Slice 1 of spec 002: agents, properties, property_photos (+ their enums), RLS, indexes, triggers.

create type public.property_source as enum ('plektan', 'admin');
create type public.property_status as enum ('published', 'hidden');
create type public.deal as enum ('sell', 'rent_long', 'rent_day');
create type public.property_type as enum ('flat', 'house', 'commercial', 'plot');
create type public.currency as enum ('UAH', 'USD', 'EUR');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- agents ---------------------------------------------------------------
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  source public.property_source not null,
  external_id text,
  name text not null,
  phones text[] not null default '{}',
  email text,
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create trigger agents_set_updated_at before update on public.agents
  for each row execute function public.set_updated_at();

-- properties -----------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  source public.property_source not null,
  external_id text,
  status public.property_status not null default 'hidden',
  deal public.deal not null,
  property_type public.property_type not null,
  prop_kind text,
  price_amount bigint check (price_amount >= 0),
  currency public.currency,
  price_usd bigint check (price_usd >= 0),
  price_per_m2 bigint check (price_per_m2 >= 0),
  area_total numeric check (area_total >= 0),
  area_life numeric check (area_life >= 0),
  area_kitchen numeric check (area_kitchen >= 0),
  area_lot numeric check (area_lot >= 0),
  room_count int check (room_count >= 0),
  storey int,
  storeys int,
  repair text,
  wall_material text,
  housing_class text,
  is_newbuilding boolean not null default false,
  locality text,
  district text,
  street text,
  house text,
  lat double precision,
  lng double precision,
  title text not null,
  description text,
  slug text not null unique,
  seo_title text,
  seo_description text,
  agent_id uuid references public.agents (id) on delete set null,
  raw jsonb,
  source_updated_at timestamptz,
  synced_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, external_id)
);

create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

create index properties_catalog_idx on public.properties (status, deal, property_type);
create index properties_price_usd_idx on public.properties (price_usd);
create index properties_area_total_idx on public.properties (area_total);
create index properties_room_count_idx on public.properties (room_count);
create index properties_district_idx on public.properties (district);
create index properties_published_at_idx on public.properties (published_at desc);
create index properties_agent_id_idx on public.properties (agent_id);

-- property_photos ------------------------------------------------------
create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  position int not null check (position >= 0),
  r2_key text not null,
  width int,
  height int,
  sizes jsonb,
  source_url text,
  created_at timestamptz not null default now(),
  unique (property_id, position)
);

-- RLS: public read of published data only; no write policies --------------
alter table public.agents enable row level security;
alter table public.properties enable row level security;
alter table public.property_photos enable row level security;

create policy "public reads active agents" on public.agents
  for select to anon, authenticated
  using (is_active);

create policy "public reads published properties" on public.properties
  for select to anon, authenticated
  using (status = 'published');

create policy "public reads photos of published properties" on public.property_photos
  for select to anon, authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_photos.property_id and p.status = 'published'
  ));
