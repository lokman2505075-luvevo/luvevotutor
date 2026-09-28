-- Run this script manually in the Supabase SQL Editor.
create table if not exists public.guardian_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  review text not null,
  rating integer not null check (rating between 1 and 5),
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.guardian_reviews enable row level security;

revoke all on public.guardian_reviews from anon;
revoke all on public.guardian_reviews from authenticated;
grant select on public.guardian_reviews to anon, authenticated;
grant insert (name, review, rating) on public.guardian_reviews to anon, authenticated;
grant update, delete on public.guardian_reviews to authenticated;

drop policy if exists guardian_reviews_public_select on public.guardian_reviews;
create policy guardian_reviews_public_select
  on public.guardian_reviews for select
  to anon, authenticated
  using (is_approved = true or public.is_admin());

drop policy if exists guardian_reviews_public_insert on public.guardian_reviews;
create policy guardian_reviews_public_insert
  on public.guardian_reviews for insert
  to anon, authenticated
  with check (is_approved = false);

drop policy if exists guardian_reviews_admin_update on public.guardian_reviews;
create policy guardian_reviews_admin_update
  on public.guardian_reviews for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists guardian_reviews_admin_delete on public.guardian_reviews;
create policy guardian_reviews_admin_delete
  on public.guardian_reviews for delete
  to authenticated
  using (public.is_admin());