-- Spec 007 slice 1: admin role. `admins` table, `is_admin()` and read access to leads for admins.
-- Admins are created in the Supabase dashboard (Auth user) plus one insert into `admins` (docs/setup.md).
-- Writes to leads stay on the service role (the server checks the admin first).

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- An admin can read only their own row. No write policies: managed with the service role / SQL editor.
create policy "admin reads own row" on public.admins
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.admins to authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()))
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- leads: read-only for admins (the grant was revoked in 002) ------------------
grant select on public.leads to authenticated;

create policy "admins read leads" on public.leads
  for select to authenticated
  using ((select public.is_admin()));
