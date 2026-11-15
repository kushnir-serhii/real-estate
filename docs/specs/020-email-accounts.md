# 020 — Email + password accounts (optional, needs a mail service)

**Status:** draft · **Depends on:** 019 · **Route(s):** `/sign-in`, `/sign-up`, `/forgot-password`, `/auth/confirm`, `/account`, `/account/reset-password`

Optional: built only if visitors without a Google account (or stuck in in-app browsers) need sync. Not in the plan until then.

## Goal
A visitor without Google creates an account with email + password; the same saved-properties sync from [019](019-user-accounts.md) works for them. Needs a mail service for confirmation and reset emails.

## Scope
- In: sign up (email, password min. 8, optional name, consent, Turnstile) with email confirmation; email + password on `/sign-in` under the Google button; resend confirmation; forgotten password → reset by email; change password, set a password for a Google account, change email (confirmed on both addresses) in `/account`; Ukrainian email templates; custom SMTP; demo mailbox `/demo/mailbox`.
- Out: magic links, phone/SMS, 2FA.

## How it works for users
- **Sign up:** `signUp({ email, password, options: { emailRedirectTo } })` → «Ми надіслали лист на <email>» with «Надіслати ще раз» after 60 s (`auth.resend`). The email links to `/auth/confirm?token_hash=…&type=email&next=…`; `verifyOtp` confirms the address and starts the session (works on any device; expires in 24 h → «Посилання застаріло» + «Надіслати новий лист»). An already registered email gets the same answer (no enumeration).
- **Sign in:** wrong email or password → «Невірний email або пароль»; unconfirmed → «Підтвердіть email» + resend; rate limit → «Забагато спроб, спробуйте за кілька хвилин».
- **Forgot password:** always «Якщо акаунт з цим email існує, ми надіслали лист»; link `/auth/confirm?type=recovery&next=/account/reset-password` → recovery session → `updateUser({ password })`.
- **Change email:** «Secure email change» → links to the old and the new address; `/account` shows «Очікує підтвердження» until both are clicked.
- **Google + password, one account:** same confirmed email → Supabase links identities to one user.
- **Emails:** sent by Supabase Auth through custom SMTP; templates use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` so links go through our route. Locally they land in Mailpit (`http://127.0.0.1:54324`), in the demo driver in `/demo/mailbox`.

## Data
- `config.toml`: `minimum_password_length = 8`, `secure_password_change = true`, double confirm on email change, `[auth.email.template.*]` → `supabase/templates/*.html`, optional `[auth.captcha]` Turnstile; redirect URL `/auth/confirm`.
- Auth driver gains `signUp`, `signInWithPassword`, `resendConfirmation`, `requestPasswordReset`, `updatePassword`, `updateEmail`; Supabase error codes → Ukrainian messages in one map with tests (`invalid_credentials`, `email_not_confirmed`, `over_email_send_rate_limit`, `weak_password`, `same_password`, `otp_expired`, …).
- Demo driver: passwords and «emails» in memory, `/demo/mailbox` lists them with working links.
- If 019 added a `before_user_created` hook that allows only Google, it is widened to email.

## Slices
Split when the spec is taken up. Rough cut: 1) sign up + confirm + sign in + templates + demo mailbox; 2) forgot / reset + account password and email changes; 3) SMTP and dashboard docs.

## External needs
- Custom SMTP (Resend / Postmark / Brevo …) on the agency's domain with SPF + DKIM (+ DMARC) DNS records; raise the Supabase email rate limit after.
- Supabase dashboard: email templates, Secure email change, min password 8, redirect URL `/auth/confirm`, optional Turnstile captcha.

## Open questions
- Magic link instead of (or next to) passwords? Same mail setup, no passwords to forget.

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
