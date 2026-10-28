-- Slice 2 of spec 002: leads, pages, settings (+ lead enums), RLS, indexes, triggers.

create type public.lead_kind as enum ('property_request', 'general', 'ai');
create type public.delivery_status as enum ('pending', 'sent', 'failed', 'skipped');

-- leads: admin-only. RLS on with no policies; written by the service role only ----
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind public.lead_kind not null,
  property_id uuid references public.properties (id) on delete set null,
  name text not null,
  phone text not null,
  email text,
  message text,
  payload jsonb,
  consent_at timestamptz not null,
  client_request_id uuid not null unique,
  page_url text,
  utm jsonb,
  plektan_status public.delivery_status not null default 'pending',
  plektan_error text,
  plektan_attempts int not null default 0,
  plektan_item_id text,
  telegram_status public.delivery_status not null default 'pending',
  telegram_error text,
  telegram_attempts int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

create index leads_created_at_idx on public.leads (created_at desc);
create index leads_kind_idx on public.leads (kind);
create index leads_property_id_idx on public.leads (property_id);
create index leads_retry_idx on public.leads (created_at)
  where plektan_status = 'failed' or telegram_status = 'failed';

alter table public.leads enable row level security;
revoke all on public.leads from anon, authenticated;

-- pages: static content (Markdown), public read ------------------------------
create table public.pages (
  slug text primary key,
  title text not null,
  body text not null default '',
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pages_set_updated_at before update on public.pages
  for each row execute function public.set_updated_at();

alter table public.pages enable row level security;

create policy "public reads pages" on public.pages
  for select to anon, authenticated
  using (true);

-- settings: exactly one row (id is always true), server-only -----------------
create table public.settings (
  id boolean primary key default true check (id),
  properties_source public.property_source not null default 'plektan',
  last_sync_at timestamptz,
  sync_cursor text,
  -- Units of each currency per 1 USD (price_usd = amount / rate); refreshed from the admin.
  exchange_rates jsonb not null default '{"UAH": 41.5, "EUR": 0.92}',
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

alter table public.settings enable row level security;
revoke all on public.settings from anon, authenticated;

insert into public.settings (id) values (true);
