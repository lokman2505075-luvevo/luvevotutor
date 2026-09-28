-- University admission data schema and access policies.
-- Apply with the Supabase SQL Editor or Supabase CLI.

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name_bn text not null,
  name_en text not null,
  category text not null check (category in (
    'engineering',
    'gst_cluster',
    'agriculture_cluster',
    'medical',
    'bds',
    'other_public',
    'national_university',
    'private'
  )),
  college_code text,
  circular_date text,
  application_start text,
  application_end text,
  exam_date text,
  exam_center text,
  result text,
  status text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists universities_active_category_order_idx
  on public.universities (is_active, category, display_order);

alter table public.universities enable row level security;

revoke all on public.universities from anon;
revoke all on public.universities from authenticated;
grant select on public.universities to anon, authenticated;
grant insert, update, delete on public.universities to authenticated;

drop policy if exists universities_public_select on public.universities;
create policy universities_public_select
  on public.universities for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists universities_admin_insert on public.universities;
create policy universities_admin_insert
  on public.universities for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists universities_admin_update on public.universities;
create policy universities_admin_update
  on public.universities for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists universities_admin_delete on public.universities;
create policy universities_admin_delete
  on public.universities for delete
  to authenticated
  using (public.is_admin());

create or replace function public.set_universities_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists universities_set_updated_at on public.universities;
create trigger universities_set_updated_at
before update on public.universities
for each row execute function public.set_universities_updated_at();
