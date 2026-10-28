# 008 — Admin: properties + photos

**Status:** draft · **Depends on:** 003, 007 · **Route(s):** `/admin/properties`, `/admin/properties/[id]`

## Goal
The agency can run the catalog without the CRM: create, edit, publish and hide properties with photos stored in R2. The longest part of the admin.

## Scope
- In: the source-of-truth switch, properties list, create/edit form, publish/hide, photo upload/reorder/delete to R2 (WebP sizes), SEO overrides per property.
- Out: bulk import from the old WordPress site (open question).

## Data
`properties`, `property_photos`, `settings.properties_source`; `src/lib/r2`.

## Slices

### [ ] 1. Source-of-truth switch
- **Build:** setting in the admin with a clear warning; in `plektan` mode Plektan-sourced properties are read-only (only SEO fields editable).
- **Agent:** backend + designer
- **Accept:**
  - [ ] sync doesn't run in `admin` mode; admin create is disabled in `plektan` mode

### [ ] 2. List + form
- **Agent:** designer
- **Accept:**
  - [ ] validation matches the DB constraints; slug stays stable after publish

### [ ] 3. Photos
- **Build:** upload (multiple, drag & drop, mobile camera), reorder, delete, cover; resize to WebP sizes (same pipeline as 003).
- **Agent:** backend + designer
- **Accept:**
  - [ ] large photos (10+ MB) handled; progress shown

## External needs
- R2 bucket and keys.

## Open questions
- Switching `plektan` → `admin`: do Plektan-sourced rows become editable admin rows? (Recommended: yes, convert in place, keep `external_id`.)
- Old WordPress site: migrate properties, who does it? (stack.md → Відкриті питання.)

## Log
| Date | Slice | Result | Notes / files |
| --- | --- | --- | --- |
