# 005 — Catalog + property page

**Status:** draft · **Depends on:** 002, 004 · **Route(s):** `/catalog`, `/catalog/[slug]`, `/favorites`

## Goal
Visitors find a property with filters, open its page with a good gallery and facts, save favorites, and reach the request form in one tap.

## Scope
- In: catalog with filters in the URL, sort, pagination; property card; property page (gallery, facts, description, location map, agent, request CTA, similar); favorites in localStorage.
- Out: request submission logic (006), SEO templates (009; basic metadata here).

## Data
`getPublishedProperties`, `getPropertyBySlug`, `property_photos`; seed data from 002.

## Slices

### [ ] 1. Catalog list + card
- **Build:** filters (deal, type, kind, rooms, price from/to + currency, area, district), sort (price, area, newest), pagination; all in `searchParams`; ISR with revalidate tag.
- **Agent:** designer
- **Accept:**
  - [ ] reload keeps filters; back button works
  - [ ] empty result explains and offers to reset filters

### [ ] 2. Property page
- **Build:** gallery (swipe + keyboard + fullscreen), price, key facts, description, address/area, agent with call/messenger, sticky mobile CTA, similar properties.
- **Agent:** designer
- **Accept:**
  - [ ] no layout shift on images; missing photos handled
  - [ ] hidden property → 404 (or "sold" page, see questions)

### [ ] 3. Map
- **Build:** location on the property page (and optional map view on the catalog).
- **Agent:** designer
- **Accept:**
  - [ ] map loads lazily, doesn't block LCP

### [ ] 4. Favorites
- **Build:** heart on card and page, `/favorites` page; localStorage with try/catch; works on one device, no login.
- **Agent:** designer · **Model:** sonnet
- **Accept:**
  - [ ] works with storage blocked (no crash)

## External needs
- Map provider key if not OSM.

## Open questions
- URL structure for SEO: `/catalog?deal=sell&type=flat` vs `/prodazh/kvartyry/…` landing URLs? (Recommended: decide with 009; landing URLs for main combos.)
- Hidden/sold property: 404, 410, or a page "already sold" + similar? (Recommended: "already sold" page with similar, `noindex`.)
- Map: Leaflet + OSM (free) or Google Maps? (Recommended: Leaflet + OSM tiles / MapTiler.)
- Show the agent on each property or always the agency phone?

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
