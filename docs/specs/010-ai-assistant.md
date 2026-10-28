# 010 — AI assistant

**Status:** draft · **Depends on:** 005, 006 · **Route(s):** widget on every public page

## Goal
A chat on the site that asks what the visitor needs, shows matching properties from our database, answers agency FAQ and turns the conversation into a structured lead. **Functionality to be agreed with Andrii before `ready`.**

## Scope
- In: chat widget; questions about district, type, rooms, budget, payment (cash/mortgage), timing, contact; search only over published properties (tool call → `getPublishedProperties`), links to them; FAQ from the agency's text; structured lead → the 006 pipeline; consent, Turnstile, rate and spend limits.
- Out: Telegram bot version (stage 2).

## Data
`leads.payload` (structured), `src/lib/llm`.

## Slices
To be split after the scope is agreed. Likely: 1) chat UI + streaming, 2) property search tool, 3) lead extraction → pipeline, 4) limits + abuse protection.

## External needs
- LLM API key; FAQ text; agreement on functionality with Andrii.

## Open questions
- Which model/provider and monthly spend cap (stack.md: ~$10–30/month)?
- Store conversation transcripts? For how long (personal data)?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
