-- Spec 006 slice 3: retry schedule for lead delivery. RLS is already on for `leads` (admin-only); no policy change.
alter table public.leads
  add column plektan_next_attempt_at timestamptz,
  add column telegram_next_attempt_at timestamptz,
  add column plektan_alerted_at timestamptz;

-- The cron query looks at failed deliveries that are due, and at old pending ones.
drop index if exists public.leads_retry_idx;
create index leads_plektan_retry_idx on public.leads (plektan_next_attempt_at)
  where plektan_status = 'failed' and plektan_next_attempt_at is not null;
create index leads_telegram_retry_idx on public.leads (telegram_next_attempt_at)
  where telegram_status = 'failed' and telegram_next_attempt_at is not null;
create index leads_pending_idx on public.leads (created_at)
  where plektan_status = 'pending' or telegram_status = 'pending';
create index leads_plektan_alert_idx on public.leads (created_at)
  where plektan_status = 'failed' and plektan_alerted_at is null;
