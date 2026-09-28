-- Job Board moderation, public read model, and tutor applications.
-- Review this migration before applying it. It does not recreate public.job_posts.

alter table public.job_posts
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists district text,
  add column if not exists locality text;

-- Keep legacy area-only rows visible in the new public shape.
update public.job_posts
set locality = area
where locality is null
  and area is not null;

-- Preserve old rows that used the legacy active value before enforcing the new workflow.
update public.job_posts
set status = 'open'
where status = 'active';

update public.job_posts
set status = 'pending'
where status is null;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.job_posts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.job_posts drop constraint if exists %I', constraint_row.conname);
  end loop;
end;
$$;

alter table public.job_posts
  alter column status set default 'pending';

alter table public.job_posts
  add constraint job_posts_status_check
  check (status in ('pending', 'open', 'closed', 'rejected'));

create or replace view public.public_job_posts
with (security_invoker = false)
as
select
  id,
  title,
  subject,
  class_level,
  district,
  locality,
  salary,
  days_per_week,
  details,
  created_at
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

-- A signed-in, approved tutor may create only an application belonging to them.
drop policy if exists job_applications_tutor_insert on public.job_applications;
create policy job_applications_tutor_insert
  on public.job_applications for insert
  to authenticated
  with check (
    tutor_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'tutor'
        and profiles.status = 'approved'
    )
  );

-- A tutor may read only their own applications.
drop policy if exists job_applications_tutor_select on public.job_applications;
create policy job_applications_tutor_select
  on public.job_applications for select
  to authenticated
  using (tutor_id = auth.uid());

-- Admins may read every application for moderation and support.
drop policy if exists job_applications_admin_select on public.job_applications;
create policy job_applications_admin_select
  on public.job_applications for select
  to authenticated
  using (public.is_admin());

-- Admins may update application status and notes.
drop policy if exists job_applications_admin_update on public.job_applications;
create policy job_applications_admin_update
  on public.job_applications for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admins may delete an application when moderation requires removal.
drop policy if exists job_applications_admin_delete on public.job_applications;
create policy job_applications_admin_delete
  on public.job_applications for delete
  to authenticated
  using (public.is_admin());

revoke all on public.job_applications from anon;
revoke all on public.job_applications from authenticated;
grant insert on public.job_applications to authenticated;
grant select, update, delete on public.job_applications to authenticated;

create or replace function public.set_job_application_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists job_applications_updated_at on public.job_applications;
create trigger job_applications_updated_at
before update on public.job_applications
for each row execute function public.set_job_application_updated_at();