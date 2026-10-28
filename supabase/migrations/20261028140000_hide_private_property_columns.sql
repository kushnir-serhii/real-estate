-- Slice 3 of spec 003: the public can't read properties.raw (Plektan payload, personal data) or properties.house (exact address).
-- Column privileges: anon/authenticated get an explicit column list. The service role keeps full access.
-- NOTE: a new column on public.properties is NOT readable by the public until it is added to the grant below
-- (in a new migration: grant select (<column>) on public.properties to anon, authenticated).
-- RLS policies (published only) are unchanged; the photos policy reads only id and status, which stay granted.

revoke select on public.properties from anon, authenticated;

grant select (
  id, source, external_id, status, deal, property_type, prop_kind,
  price_amount, currency, price_usd, price_per_m2,
  area_total, area_life, area_kitchen, area_lot,
  room_count, storey, storeys, repair, wall_material, housing_class, is_newbuilding,
  locality, district, street, lat, lng,
  title, description, slug, seo_title, seo_description,
  agent_id, source_updated_at, synced_at, published_at, created_at, updated_at
) on public.properties to anon, authenticated;
