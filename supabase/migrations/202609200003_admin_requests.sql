-- Additive request-management fields and admin-only request access.
-- Run this in the Supabase SQL Editor after the existing schema migrations.

alter table public.profiles
  add column if not exists role text;

alter table public.profiles
  alter column role set default 'user';

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- Request tables currently written by the public forms.
alter table public.print_orders
  add column if not exists status text not null default 'new',
  add column if not exists admin_note text,
  add column if not exists assigned_to uuid null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.admission_applications
  add column if not exists status text not null default 'new',
  add column if not exists admin_note text,
  add column if not exists assigned_to uuid null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.assignment_requests
  add column if not exists status text not null default 'new',
  add column if not exists admin_note text,
  add column if not exists assigned_to uuid null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.helpers
  add column if not exists status text not null default 'new',
  add column if not exists admin_note text,
  add column if not exists assigned_to uuid null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.study_groups
  add column if not exists status text not null default 'new',
  add column if not exists admin_note text,
  add column if not exists assigned_to uuid null,
  add column if not exists updated_at timestamptz not null default now();

DO $$
DECLARE
  request_table text;
BEGIN
  FOREACH request_table IN ARRAY ARRAY[
    'print_orders',
    'admission_applications',
    'assignment_requests',
    'helpers',
    'study_groups'
  ] LOOP
    EXECUTE format('alter table public.%I drop constraint if exists %I', request_table, request_table || '_status_check');
    EXECUTE format(
      'alter table public.%I add constraint %I check (status in (''new'', ''contacted'', ''in_progress'', ''completed'', ''cancelled''))',
      request_table,
      request_table || '_status_check'
    );

    EXECUTE format('alter table public.%I enable row level security', request_table);

    EXECUTE format('drop policy if exists %I on public.%I', request_table || '_anon_insert', request_table);
    EXECUTE format('drop policy if exists %I on public.%I', request_table || '_admin_select', request_table);
    EXECUTE format('drop policy if exists %I on public.%I', request_table || '_admin_update', request_table);
    EXECUTE format('drop policy if exists %I on public.%I', request_table || '_admin_delete', request_table);

    EXECUTE format(
      'create policy %I on public.%I for insert to anon, authenticated with check (true)',
      request_table || '_anon_insert', request_table
    );
    EXECUTE format(
      'create policy %I on public.%I for select to authenticated using (public.is_admin())',
      request_table || '_admin_select', request_table
    );
    EXECUTE format(
      'create policy %I on public.%I for update to authenticated using (public.is_admin()) with check (public.is_admin())',
      request_table || '_admin_update', request_table
    );
    EXECUTE format(
      'create policy %I on public.%I for delete to authenticated using (public.is_admin())',
      request_table || '_admin_delete', request_table
    );

    EXECUTE format('revoke all on public.%I from anon', request_table);
    EXECUTE format('revoke all on public.%I from authenticated', request_table);
    EXECUTE format('grant insert on public.%I to anon, authenticated', request_table);
    EXECUTE format('grant select, update, delete on public.%I to authenticated', request_table);
  END LOOP;
END;
$$;

-- Keep updated_at current whenever an admin changes a request.
create or replace function public.set_request_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DO $$
DECLARE
  request_table text;
BEGIN
  FOREACH request_table IN ARRAY ARRAY[
    'print_orders',
    'admission_applications',
    'assignment_requests',
    'helpers',
    'study_groups'
  ] LOOP
    EXECUTE format('drop trigger if exists %I on public.%I', request_table || '_updated_at', request_table);
    EXECUTE format(
      'create trigger %I before update on public.%I for each row execute function public.set_request_updated_at()',
      request_table || '_updated_at', request_table
    );
  END LOOP;
END;
$$;

-- Example: set your own authenticated account as an admin.
-- update public.profiles set role = 'admin' where id = auth.uid();
