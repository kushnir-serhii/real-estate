# 004 — Site shell + static pages

**Status:** draft · **Depends on:** 001 · **Route(s):** `/`, `/about`, `/contacts`, 404

## Goal
The frame of the public site — header, navigation, footer with the mandatory Plektan button — and the static pages, so the site looks like the agency from day one.

## Scope
- In: `(site)` layout, header (logo, nav, phone, CTA), mobile menu, footer (contacts, socials, Plektan partner button, privacy policy link), home, about, contacts, privacy policy, 404.
- Out: catalog (005), forms logic (006; placeholders here), CMS editing (009).

## Data
`pages` (from 002) for static text, or hardcoded until 002 is done.

## Slices

### [ ] 1. Layout: header + footer
- **Agent:** designer
- **Accept:**
  - [ ] Plektan partner button in the footer of every page (code from the original Plektan doc)
  - [ ] mobile menu works with keyboard, traps focus, 44px targets

### [ ] 2. Home
- **Build:** hero with a quick search (deal, type, rooms, budget → `/catalog?…`), featured properties block (seed data), about, CTA.
- **Agent:** designer
- **Accept:**
  - [ ] quick search builds the catalog URL
  - [ ] all states incl. no featured properties

### [ ] 3. About, contacts, privacy, 404
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] phone and messenger links are tappable (`tel:`, Telegram/Viber)

## External needs
- Logo, brand colors, texts (about, contacts, privacy policy), photos of the team/office from Andrii.

## Open questions
- Is there a brand/logo, or does the designer make one?
- Messengers to show (Telegram, Viber, WhatsApp)?
- Map on contacts: embed or static image?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
