# 006 — Leads: forms → Supabase → Plektan → Telegram

**Status:** draft · **Depends on:** 002, 004 · **Route(s):** forms on `/catalog/[slug]`, `/contacts`, home

## Goal
Every request a visitor sends is saved, reaches Plektan as a lead and pings the manager in Telegram within seconds — and is never lost if Plektan or Telegram fails.

## Scope
- In: property request form ("Цікавить об'єкт №…"), general request form (buy/rent wishes), consent to personal data processing, Turnstile, server action, Plektan `addAdvert`, Telegram message, retry cron.
- Out: admin list (007), AI leads (010; reuses this pipeline).

## Data
`leads`; `src/lib/plektan` (`addAdvert`), `src/lib/telegram`, `src/lib/turnstile`.

## Slices

### [ ] 1. Forms + save
- **Build:** forms with name, phone (UA mask/validation), optional email and message, consent checkbox; Turnstile; server action with zod → `leads`; success and error states.
- **Agent:** designer (UI) + backend (action)
- **Accept:**
  - [ ] the lead is in Supabase even with Plektan/Telegram keys empty
  - [ ] double submit doesn't create two leads

### [ ] 2. Delivery: Plektan + Telegram
- **Build:** after save: `addAdvert` (quick request with `like_advert` = Plektan id for property requests; buy/hire for general), Telegram message to the manager chat (name, phone, property link, message). Status/error/attempts per channel.
- **Agent:** backend
- **Accept:**
  - [ ] a Plektan error leaves `plektan_status = failed` and the Telegram message still goes out

### [ ] 3. Retry
- **Build:** cron endpoint retries failed deliveries with backoff, max attempts; Telegram alert if Plektan keeps failing.
- **Agent:** backend
- **Accept:**
  - [ ] a lead that failed is delivered on the next run once the fixture succeeds

## External needs
- Telegram bot token + manager chat id; Turnstile keys; Plektan key.
- Privacy policy text (004).

## Open questions
- `addAdvert` requires `client_email` for quick requests — what if the visitor gives only a phone? (Check with Plektan; fallback: general request type.)
- Which manager(s) get Telegram messages — one chat or per agent?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
