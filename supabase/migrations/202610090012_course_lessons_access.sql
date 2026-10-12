-- Restrict course lesson metadata and Bunny video identifiers to course members.
-- Run this in the Supabase SQL Editor after the existing course and admin schemas.

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  bunny_video_id text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists course_lessons_course_order_idx
  on public.course_lessons (course_id, order_index);

create or replace function public.can_read_course_lessons(target_course_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.courses
      where id = target_course_id
        and teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.purchases
      where course_id = target_course_id
        and student_id = auth.uid()
        and status = 'paid'
    );
$$;

revoke all on function public.can_read_course_lessons(uuid) from public, anon;
grant execute on function public.can_read_course_lessons(uuid) to authenticated;

alter table public.course_lessons enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'course_lessons'
      and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy if exists %I on public.course_lessons', existing_policy.policyname);
  end loop;
end;
$$;

create policy course_lessons_enrolled_select
  on public.course_lessons
  for select
  to authenticated
  using (public.can_read_course_lessons(course_id));

revoke all on public.course_lessons from public, anon, authenticated;
grant select on public.course_lessons to authenticated;
