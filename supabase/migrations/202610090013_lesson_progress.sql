-- Store private per-user lesson progress for the course player.
-- Run after 202610090012_course_lessons_access.sql.

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  completed boolean not null default false,
  last_position_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint lesson_progress_user_lesson_unique unique (user_id, lesson_id),
  constraint lesson_progress_position_nonnegative check (last_position_seconds >= 0)
);

create index if not exists lesson_progress_user_course_idx
  on public.lesson_progress (user_id, course_id);

alter table public.lesson_progress enable row level security;

drop policy if exists lesson_progress_owner_select on public.lesson_progress;
drop policy if exists lesson_progress_owner_insert on public.lesson_progress;
drop policy if exists lesson_progress_owner_update on public.lesson_progress;
drop policy if exists lesson_progress_owner_delete on public.lesson_progress;

create policy lesson_progress_owner_select
  on public.lesson_progress
  for select
  to authenticated
  using (user_id = auth.uid());

create policy lesson_progress_owner_insert
  on public.lesson_progress
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.can_read_course_lessons(course_id)
    and exists (
      select 1
      from public.course_lessons
      where id = lesson_progress.lesson_id
        and course_id = lesson_progress.course_id
    )
  );

create policy lesson_progress_owner_update
  on public.lesson_progress
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.can_read_course_lessons(course_id)
    and exists (
      select 1
      from public.course_lessons
      where id = lesson_progress.lesson_id
        and course_id = lesson_progress.course_id
    )
  );

create policy lesson_progress_owner_delete
  on public.lesson_progress
  for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on public.lesson_progress from public, anon, authenticated;
grant select, insert, update, delete on public.lesson_progress to authenticated;
