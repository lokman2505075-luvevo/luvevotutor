-- Tutor profile data, approval workflow, and the safe public read model.
-- Run this in the Supabase SQL Editor, or apply it with the Supabase CLI.

alter table public.profiles
  add column if not exists photo_url text,
  add column if not exists subjects text[] not null default '{}',
  add column if not exists district text,
  add column if not exists short_bio text,
  add column if not exists status text not null default 'pending',
  add column if not exists rating numeric(3,2),
  add column if not exists review_count integer not null default 0,
  add column if not exists created_at timestamptz not null default now();

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));

create index if not exists profiles_approved_tutors_idx
  on public.profiles (status, role, district, rating desc nulls last, created_at desc);

create or replace view public.public_tutors
with (security_invoker = false)
as
select
  id,
  full_name,
  photo_url,
  subjects,
  district,
  short_bio,
  created_at,
  rating,
  review_count
from public.profiles
where role = 'tutor'
  and status = 'approved';

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.public_tutors to anon, authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', existing_policy.policyname);
  end loop;
end;
$$;

alter table public.profiles enable row level security;

create policy "profiles_owner_select"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "profiles_owner_update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check (auth.uid() = id or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Keep the auth trigger as the only path that creates a profile. Tutor signups
-- receive pending status and remain invisible through public_tutors until review.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, phone, email, role, subjects, district, short_bio, status
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    case
      when new.raw_user_meta_data ->> 'role' in ('student', 'tutor')
        then new.raw_user_meta_data ->> 'role'
      else 'student'
    end,
    coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'subjects', '[]'::jsonb))), '{}'),
    nullif(new.raw_user_meta_data ->> 'district', ''),
    nullif(new.raw_user_meta_data ->> 'short_bio', ''),
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
