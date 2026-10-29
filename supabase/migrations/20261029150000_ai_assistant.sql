-- Slice 1 of spec 010: AI assistant conversations and messages.
-- Admin-only: RLS on with no policies, written and read by the service role only.

-- ai_conversations: one chat. The server owns the state; history is never taken from the client.
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  page_url text,
  property_id uuid references public.properties (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  -- The wishes proposed by the model (slice 3); the lead is created from this, never from the client's copy.
  proposal jsonb,
  message_count int not null default 0,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric not null default 0,
  -- Salted hash of the visitor's IP (slice 4), never the raw address.
  ip_hash text,
  turnstile_ok boolean not null default false
);

create trigger ai_conversations_set_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create index ai_conversations_created_at_idx on public.ai_conversations (created_at);

-- ai_messages: the transcript. Deleted with the conversation (30-day cleanup, slice 4).
create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'tool')),
  content text not null default '',
  -- Tool calls / tool results (slice 2+).
  data jsonb,
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

alter table public.ai_conversations enable row level security;
revoke all on public.ai_conversations from anon, authenticated;

alter table public.ai_messages enable row level security;
revoke all on public.ai_messages from anon, authenticated;
