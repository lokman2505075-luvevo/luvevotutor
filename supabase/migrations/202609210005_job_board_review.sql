-- Job Board schema review migration.
-- Review only: do not run automatically. public.job_posts already exists and is only altered here.

alter table public.job_posts
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists district text,
  add column if not exists locality text;

-- Keep legacy rows usable when they stored the location in area or used active.
update public.job_posts
set locality = coalesce(locality, area)
where locality is null;

update public.job_posts
set status = case when status = 'active' then 'open' else status end;

update public.job_posts
set status = 'pending'
where status is null
   or status not in ('pending', 'open', 'closed', 'rejected');

alter table public.job_posts
  alter column status set default 'pending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.job_posts'::regclass
      and conname = 'job_posts_status_check'
  ) then
    alter table public.job_posts
      add constraint job_posts_status_check
      check (status in ('pending', 'open', 'closed', 'rejected'));
  end if;
end;
$$;

-- Public readers can see only moderated, non-contact fields.
create or replace view public.public_job_posts
with (security_invoker = false)
as
select id, title, subject, class_level, district, locality, salary,
       days_per_week, details, created_at
from public.job_posts
where status = 'open';

revoke all on public.public_job_posts from public;
grant select on public.public_job_posts to anon, authenticated;

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_posts(id) on delete cascade,
  tutor_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status text not null default 'new',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, tutor_id),
  constraint job_applications_message_length check (message is null or char_length(message) <= 300),
  constraint job_applications_status_check check (status in ('new', 'contacted', 'in_progress', 'completed', 'cancelled'))
);

alter table public.job_applications enable row level security;

-- Allows an authenticated user to insert only their own application when they are an approved tutor.
drop policy if exists job_applications_tutor_insert on public.job_applications;
create policy job_applications_tutor_insert
  on public.job_applications for insert to authenticated
  with check (
    tutor_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'tutor'
        and profiles.status = 'approved'
    )
  );

-- Allows a tutor to read only applications belonging to that tutor.
drop policy if exists job_applications_tutor_select on public.job_applications;
create policy job_applications_tutor_select
  on public.job_applications for select to authenticated
  using (tutor_id = auth.uid());

-- Allows an admin to read every application.
drop policy if exists job_applications_admin_select on public.job_applications;
create policy job_applications_admin_select
  on public.job_applications for select to authenticated
  using (public.is_admin());

-- Allows an admin to change application status or notes.
drop policy if exists job_applications_admin_update on public.job_applications;
create policy job_applications_admin_update
  on public.job_applications for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Allows an admin to delete an application.
drop policy if exists job_applications_admin_delete on public.job_applications;
create policy job_applications_admin_delete
  on public.job_applications for delete to authenticated
  using (public.is_admin());

-- The application table is never readable or writable by anonymous users.
revoke all on public.job_applications from anon;
revoke all on public.job_applications from authenticated;
grant insert on public.job_applications to authenticated;
grant select, update, delete on public.job_applications to authenticated;
