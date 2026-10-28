# 007 — Admin: sign-in + leads

**Status:** draft · **Depends on:** 002, 006 · **Route(s):** `/admin`, `/admin/sign-in`, `/admin/leads`

## Goal
Andrii and staff sign in to the admin and see every lead with its delivery status, even when the CRM is gone.

## Scope
- In: Supabase Auth (email + password or magic link), admin role check, admin layout, leads list with filters and detail, delivery status + manual retry.
- Out: lead pipeline (statuses, owners, notes — stage 2), properties (008).

## Data
`leads`; admin role via a `profiles`/`admins` table or Supabase custom claim; RLS for admin read.

## Slices

### [ ] 1. Auth + admin layout
- **Agent:** backend + designer
- **Accept:**
  - [ ] non-admins and anonymous users can't open any `/admin` route or read leads
  - [ ] admin pages are `noindex`

### [ ] 2. Leads list + detail
- **Agent:** designer
- **Accept:**
  - [ ] filter by kind and date, search by phone/name, pagination
  - [ ] failed delivery shows the error and a "retry" button

## External needs
- Who are the admin users (emails)?

## Open questions
- Magic link or password? (Recommended: magic link.)

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
