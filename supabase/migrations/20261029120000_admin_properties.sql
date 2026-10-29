-- Spec 008 slice 1: admins read every property and every photo (hidden and draft too); drafts never reach the public;
-- saving exchange rates recomputes price_usd.
-- No write policies: writes go through the service role after requireAdmin().
-- Column privileges stay as in 20261028140000: `house` and `raw` are not granted to `authenticated`;
-- the edit page reads them with the service role after the admin check.

create policy "admins read all properties" on public.properties
  for select to authenticated
  using ((select public.is_admin()));

create policy "admins read all photos" on public.property_photos
  for select to authenticated
  using ((select public.is_admin()));

-- Drafts (hidden, never published) get no hidden_at, so the public "sold page" window (7 days after hidden_at)
-- never shows them. A property that was published once gets hidden_at when it is hidden, as before.
create or replace function public.set_property_hidden_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'hidden' and new.hidden_at is null and new.published_at is not null then
      new.hidden_at = now();
    elsif new.status = 'hidden' and new.published_at is null then
      new.hidden_at = null;
    elsif new.status = 'published' then
      new.hidden_at = null;
    end if;
  elsif new.status is distinct from old.status then
    if new.status = 'hidden' and new.published_at is not null then
      new.hidden_at = now();
    else
      new.hidden_at = null;
    end if;
  end if;
  return new;
end;
$$;

-- Existing never-published hidden rows (none expected) leave the public window too.
update public.properties set hidden_at = null where status = 'hidden' and published_at is null and hidden_at is not null;

-- Saves the exchange rates (units per 1 USD) and recomputes price_usd of every priced property in one transaction.
-- Only rows whose value changes are updated. Called by the service role from the admin rates action.
create function public.save_exchange_rates(p_uah numeric, p_eur numeric)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed integer;
begin
  if p_uah is null or p_eur is null or p_uah <= 0 or p_eur <= 0 then
    raise exception 'rates must be positive';
  end if;

  update public.settings
  set exchange_rates = jsonb_build_object('UAH', p_uah, 'EUR', p_eur)
  where id;

  update public.properties
  set price_usd = case currency
      when 'USD' then price_amount
      when 'UAH' then round(price_amount / p_uah)::bigint
      when 'EUR' then round(price_amount / p_eur)::bigint
    end
  where price_amount is not null
    and currency is not null
    and price_usd is distinct from case currency
      when 'USD' then price_amount
      when 'UAH' then round(price_amount / p_uah)::bigint
      when 'EUR' then round(price_amount / p_eur)::bigint
    end;

  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke execute on function public.save_exchange_rates(numeric, numeric) from public, anon, authenticated;
grant execute on function public.save_exchange_rates(numeric, numeric) to service_role;
