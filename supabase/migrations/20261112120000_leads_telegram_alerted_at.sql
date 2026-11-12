-- Spec 017 slice 3: when the manager-alert for a lead whose Telegram delivery ran out of attempts was sent
-- (mirrors `plektan_alerted_at`). RLS is already on for `leads` (admin-only); no policy change.
alter table public.leads
  add column telegram_alerted_at timestamptz;
