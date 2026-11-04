-- Slice 4 of spec 010: monthly spend counter, message dedupe, IP rate-limit index.
-- Admin-only like the other assistant tables: RLS on with no policies, service role only.

-- ai_usage: one row per month (first day of the month, UTC).
create table public.ai_usage (
  month date primary key,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd numeric not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

-- Atomic increment: concurrent turns never lose an update.
create function public.add_ai_usage(p_month date, p_input bigint, p_output bigint, p_cost numeric)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.ai_usage as u (month, input_tokens, output_tokens, cost_usd)
  values (p_month, p_input, p_output, p_cost)
  on conflict (month) do update set
    input_tokens = u.input_tokens + excluded.input_tokens,
    output_tokens = u.output_tokens + excluded.output_tokens,
    cost_usd = u.cost_usd + excluded.cost_usd,
    updated_at = now();
$$;

revoke execute on function public.add_ai_usage(date, bigint, bigint, numeric) from public, anon, authenticated;
grant execute on function public.add_ai_usage(date, bigint, bigint, numeric) to service_role;

-- Dedupe of a retried visitor message (the client sends the same id again after a failure).
alter table public.ai_messages add column client_message_id uuid;
create unique index ai_messages_client_message_idx on public.ai_messages (conversation_id, client_message_id);

-- IP rate limit: conversations of one hashed IP, then their recent messages via ai_messages_conversation_idx.
create index ai_conversations_ip_hash_idx on public.ai_conversations (ip_hash, created_at) where ip_hash is not null;
