# 010 — AI assistant

**Status:** in-progress · **Depends on:** 005, 006 · **Route(s):** widget on every public page (`(site)` layout), `POST /api/assistant`, `POST /api/cron/assistant`

## Goal
A chat on the site that asks what the visitor needs, shows matching properties from our database, answers agency FAQ and turns the conversation into a structured lead. The manager gets a qualified request (deal, type, district, rooms, budget, payment, timing, contact) through the same pipeline as the forms (006), and it is never lost if Plektan or Telegram fails.

## Scope
- In: chat widget on every public page (not the admin); questions about deal, district, type, rooms, budget, payment (cash/mortgage), timing, contact; search only over published properties (tool call → `getPublishedProperties`), property cards with links in the chat; FAQ from the agency's text (mock, `src/constants/assistant.ts`); confirmation card → structured lead (`kind = ai`) → the 006 pipeline; transcripts stored 30 days and shown on the lead in the admin; Turnstile, rate limits, message caps, monthly spend cap.
- Out: Telegram bot version (stage 2); general real-estate / legal / mortgage advice beyond the FAQ; voice; file uploads.

## Data
New tables (admin-only, RLS on, no public policies, written by the service role): `ai_conversations`, `ai_messages`, `ai_usage` (slice 4). `leads.payload` (structured), `src/lib/llm`, `src/features/assistant/`, `src/constants/assistant.ts`.

- **Provider:** OpenAI Chat Completions, model from `LLM_MODEL` (default `gpt-4o-mini`), key `LLM_API_KEY`. Own thin client in `src/lib/llm/` on `fetch` + zod (no new libraries; Workers-compatible): streaming (SSE), tool calls, timeout, usage (prompt/completion tokens) from the final chunk (`stream_options.include_usage`).
- **Fixture mode (empty `LLM_API_KEY`):** a scripted assistant in `src/lib/llm/fixtures/` that speaks the same interface (streams text, calls the same tools). It picks deal / type / rooms / budget out of the message with simple rules, runs the real search tool on the local DB, offers the lead card when the visitor agrees or types a phone number. The whole flow works locally without a key.
- **Conversation state lives on the server.** The client sends only `{ conversation_id?, message, page_url, property_slug? }`; history is loaded from `ai_messages`, never trusted from the client. The client keeps a display copy + `conversation_id` in `sessionStorage` (wrapped in try/catch), so a reload keeps the chat.
- **Stream format:** `POST /api/assistant` answers `application/x-ndjson`, one event per line: `{type:"conversation", id}` · `{type:"text", delta}` · `{type:"properties", items:[…card data…], total, catalog_url}` · `{type:"lead_card", proposal_id, prefill:{name?, phone?}, summary}` · `{type:"limit", reason}` · `{type:"error", message}` · `{type:"done"}`. zod-typed on both ends.
- **System prompt:** built from `src/constants/assistant.ts` (persona name, agency facts, FAQ entries, greeting and quick replies, rules): answer only about our properties and the FAQ; never invent properties, prices or facts — properties only from the tool; answer in the visitor's language (default Ukrainian); ask one or two things at a time; when the visitor is ready, call `propose_lead`. On a property page the prompt includes that property's title, price, deal, type, rooms, district and URL (resolved server-side from `property_slug`, published only).
- **Tools:** `search_properties` (deal, property_type, rooms[], budget from/to + currency, district, sort; max 5 results) → maps to `PropertyFilters` (budget → USD with the exchange rates, as the catalog does) → `getPublishedProperties`; the model gets a compact list (title, price, rooms, area, district, URL), the client gets cards + a «Усі результати в каталозі» link with the same filters. `propose_lead` (summary + wishes: deal, property_type, districts, rooms, budget, payment `cash|mortgage|unknown`, timing, name?, phone?) → stored on the conversation, the client gets a `lead_card`.
- **Lead card:** name, phone (the 006 mask and validation), optional email, short summary of the wishes, consent checkbox with the `/privacy` link (set by the person, never by the model), «Надіслати». Submitted by a server action → `createLead` with `kind = ai`, `client_request_id`, `page_url`, `property_id` (when the chat was on a property page), `payload` = the stored proposal's wishes + `summary` + `conversation_id`, never the client's copy of the wishes. Then `deliverLead` via `after()`, exactly like 006. Success/error states like the forms. The conversation gets `lead_id`.
- **Plektan / Telegram for AI leads:** payload keeps `deal` (buy | rent) and `property_type` so the existing mapping works; `advert_info` and the Telegram text add districts, rooms, budget, payment, timing and the summary.
- **Transcripts:** `ai_messages` rows (role user/assistant/tool, content, tool data jsonb). Deleted with their conversation after **30 days** by the cleanup cron; the structured wishes stay in the lead. The admin lead detail shows the transcript while it exists («Переписка видалена через 30 днів» after).
- **Limits (slice 4), changeable in env:** Turnstile once per conversation (token with the first message; empty secret = pass, as in 006); 20 messages per 10 min per IP (stored as a salted hash, never the raw IP); 30 visitor messages per conversation; 1000 characters per message; monthly spend cap `LLM_MONTHLY_BUDGET_USD` (default 20) counted from token usage × price constants in `src/lib/llm/pricing.ts`. Over a limit → `{type:"limit"}` → the chat shows a calm message with the general request form (006) and the agency contacts. The fixture costs 0.
- **Widget UI:** floating round button bottom-right on every `(site)` page (above the property page's mobile bar), `aria-label`, 44px+. Opens a panel: full screen at 375px, a ~400px side panel on desktop; focus trapped, Esc closes, focus returns to the button. Greeting + quick replies («Купити», «Орендувати», «Питання про агенцію»). The panel code is loaded on open (dynamic import), so the pages stay fast. States: empty (greeting), streaming (typing indicator, text appears live, `aria-live="polite"`), error with retry, limit, long messages wrap, property cards with a missing-photo placeholder. A note under the input: «Відповіді генерує ШІ, можливі неточності».

## Slices

### [x] 1. LLM client, conversation API, chat widget
- **Build:** backend: `src/lib/llm/` (OpenAI chat client with streaming + tool calls + usage, timeout, typed errors without the key; fixture assistant on empty key; `index.ts` picks one by env), migration `ai_conversations` (id, created_at, updated_at, page_url, property_id, lead_id, proposal jsonb, message_count, input/output tokens, cost_usd, ip_hash, turnstile_ok) + `ai_messages` (conversation_id fk cascade, role, content, data jsonb, created_at) with RLS on and no public access; types regenerated; `src/constants/assistant.ts` (persona, greeting, quick replies, mock FAQ, agency facts from existing constants); `src/features/assistant/` server code: system prompt builder, `runAssistantTurn` (load history → LLM → stream events → save messages + usage); `POST /api/assistant` route (zod body, NDJSON stream). No tools yet. UI (designer): widget button + lazy panel in `(site)/layout.tsx`, message list, input (label, Enter to send, Shift+Enter newline, 1000-char counter), streaming text, quick replies, all states above, sessionStorage restore.
- **Files:** `src/lib/llm/*`, `supabase/migrations/*`, `src/lib/supabase/database.types.ts`, `src/lib/db/assistant.ts`, `src/constants/assistant.ts`, `src/features/assistant/*`, `src/app/api/assistant/route.ts`, `src/app/(site)/layout.tsx`, `.env.example`, `docs/setup.md`
- **Agent:** backend → designer
- **Accept:**
  - [x] with an empty `LLM_API_KEY` the chat answers (fixture) and the reply streams in
  - [x] history comes from the DB: a second message in the same conversation continues it; a forged `conversation_id` starts a new one
  - [x] new tables have RLS and no public access; types regenerated; migration in `docs/setup.md`
  - [x] widget on every public page, not in the admin; 375px full screen, keyboard (Esc, focus return), all states designed and announced
  - [x] unit tests: OpenAI SSE parsing (text, tool call deltas, usage), event schema

### [x] 2. Property search tool + cards in the chat
- **Build:** `search_properties` tool (schema, filter mapping incl. budget currency → USD via exchange rates, max 5, compact result for the model), tool loop in `runAssistantTurn` (max 3 tool rounds per turn), `properties` event; fixture assistant uses the tool; property context on a property page. UI: compact property cards in the chat (photo or placeholder, title, formatted price, rooms/area/district, link), «Усі результати в каталозі» link with the same filters, empty result («Таких об'єктів зараз немає» + the assistant offers to leave a request).
- **Files:** `src/features/assistant/*`, `src/lib/llm/fixtures/*`, `src/features/catalog/catalog-params.ts` (only if a shared URL builder is needed)
- **Agent:** backend → designer
- **Accept:**
  - [x] only published properties are returned; nothing the tool didn't return is shown as a card
  - [x] budget in UAH/EUR/USD filters like the catalog; the catalog link reproduces the same filters
  - [x] on a property page the assistant knows the property (prompt context from the server, published only)
  - [x] unit tests for the filter mapping; cards work at 375px with a missing photo

### [ ] 3. FAQ + lead card → pipeline + transcript in the admin
- **Build:** FAQ in the prompt from `src/constants/assistant.ts`; `propose_lead` tool (zod wishes, stored on the conversation, `lead_card` event); fixture offers the card; lead card UI (name, phone mask, email, summary, consent + `/privacy`, pending/success/error, announced); server action `submitAssistantLead` (zod, conversation must exist and have a proposal, honeypot, `createLead` kind `ai`, `lead_id` on the conversation, `after(deliverLead)`); `lead-delivery-content.ts` and `read-lead-wishes.ts` learn the AI fields (districts, rooms, budget, payment, timing, summary); admin lead detail shows the wishes and the transcript (or «переписку видалено»).
- **Files:** `src/features/assistant/*`, `src/lib/llm/fixtures/*`, `src/features/leads/{lead-delivery-content,lead-delivery-content.test}.ts`, `src/features/admin/leads/*`, `src/app/admin/(panel)/leads/[id]/page.tsx`, `src/lib/db/assistant.ts`, `src/lib/db/admin-leads.ts`
- **Agent:** backend → designer
- **Accept:**
  - [ ] a confirmed card creates one `ai` lead (double submit → one lead) with the structured payload from the server, not from the client
  - [ ] no consent → nothing saved; the model can't create a lead without the card
  - [ ] Plektan request and Telegram text carry the AI wishes; unit tests
  - [ ] the admin lead page shows the wishes and the transcript; 375px

### [ ] 4. Limits, Turnstile, spend cap, cleanup
- **Build:** migration `ai_usage` (month pk, input/output tokens, cost_usd) + an atomic increment function (service role only); Turnstile token with the first message (widget in the panel, invisible/managed; empty site key = no widget); IP rate limit (salted hash, `ASSISTANT_IP_SALT`), per-conversation and per-message caps, monthly budget check before calling the LLM; `limit` event → fallback UI (general request form + contacts); `POST /api/cron/assistant` (`CRON_SECRET`) deletes conversations older than 30 days; step in `.github/workflows/sync.yml`. Env vars in `.env.example` and `docs/setup.md`.
- **Files:** `supabase/migrations/*`, `src/lib/supabase/database.types.ts`, `src/lib/llm/pricing.ts`, `src/features/assistant/*`, `src/lib/db/assistant.ts`, `src/app/api/assistant/route.ts`, `src/app/api/cron/assistant/route.ts`, `.github/workflows/sync.yml`, `.env.example`, `docs/setup.md`
- **Agent:** backend → designer
- **Accept:**
  - [ ] the 21st message in 10 min from one IP, the 31st in a conversation and a 1001-char message are refused with the right `limit` reason, without calling the LLM
  - [ ] when the month's cost reaches the cap the chat shows the fallback; usage is counted from token usage × pricing
  - [ ] a failed Turnstile check refuses the first message; empty secret passes
  - [ ] the cleanup cron deletes conversations (and messages) older than 30 days and keeps leads; unit tests for the limits and cost math

## External needs
- OpenAI API key (`LLM_API_KEY`) with a hard monthly limit set in the OpenAI dashboard too (belt and braces with `LLM_MONTHLY_BUDGET_USD`).
- The agency's real FAQ text and assistant persona (replace the mock in `src/constants/assistant.ts`).
- Agreement on the assistant's functionality with Andrii (built per the decisions below).
- Migrations of this spec applied; `ASSISTANT_IP_SALT` set in Cloudflare.
- Privacy policy (`/privacy`) mentions the assistant: transcripts kept 30 days, processed by OpenAI.

## Open questions
- **Decided:** OpenAI `gpt-4o-mini` (model in env), own fetch client, no new libraries.
- **Decided:** the lead is created from a confirmation card in the chat; consent is set by the person.
- **Decided:** transcripts stored 30 days (admin-only), shown on the lead; the structured wishes stay in the lead.
- Retry after an error that came after the visitor's message was saved stores that message twice on the server: add a `client_message_id` (dedupe) in slice 4.
- The reply keeps streaming after the panel is closed (so it isn't lost); it stops on «Нова розмова» or leaving the site.
- No live end-to-end run yet: this project's local Supabase can't start while another project's stack holds ports 54321–54324; DB flow covered by unit tests with the DB mocked.
- The search tool and the turn loop are tested separately (tool with injected data, loop with a mocked tool); no live run against a DB yet.
- Chat cards use one `photo_url` (smallest R2 size) without `srcset`: may look soft on retina if that size is under ~192px.
- On desktop the chat panel is modal (page dimmed behind it); make it non-modal if the client wants to browse beside the chat.
- **Decided:** limits $20/month, 20 messages / 10 min per IP, 30 per conversation, 1000 chars; Turnstile once per conversation; widget on all public pages; property context on property pages; only our properties + FAQ, visitor's language (default Ukrainian).

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
| 2026-10-29 | — | ready | Decisions recorded: OpenAI gpt-4o-mini, confirmation card, transcripts 30 days, default limits and widget. |
| 2026-10-29 | 1 | done | OpenAI fetch client (SSE parse, tool-call deltas, usage, typed errors) + scripted fixture on empty key; migration `20261029150000_ai_assistant.sql` (`ai_conversations`, `ai_messages`, RLS, no public access), types regenerated from a throwaway Postgres; `src/constants/assistant.ts` (persona, FAQ mock); system prompt, `runAssistantTurn`, `POST /api/assistant` (NDJSON). Widget: lazy panel (Sheet), launcher above the property mobile bar, streaming, quick replies, error/limit states, sessionStorage. Files: `src/lib/llm/*`, `src/lib/db/assistant.ts`, `src/features/assistant/*`, `src/app/api/assistant/route.ts`, `src/app/(site)/layout.tsx`, `src/app/globals.css`, `src/components/layout/site-footer.tsx`, `src/features/property/property-mobile-bar.tsx`, `.env.example`, `docs/setup.md` |
| 2026-10-29 | 2 | done | `search_properties` tool (zod args from the model, reuses `parseCatalogState` / `toPropertyFilters` / `catalogHref`, budget → USD, district match, max 5), tool loop (≤3 rounds, tool calls + results stored, history trimmed without orphans), fixture calls the tool; chat cards (parts-based reducer, storage migration, placeholder, catalog link, empty note, announced). `countObjects` moved to `src/lib/format/`. Files: `src/features/assistant/*`, `src/lib/llm/fixtures/*`, `src/lib/format/count-objects.ts`, `src/features/admin/{pages,settings}/*` (imports) |
