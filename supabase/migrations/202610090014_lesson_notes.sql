-- Store private timestamped notes for each user's lessons.
-- Run after 202610090013_lesson_progress.sql.

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.course_lessons(id) on delete cascade,
  content text not null,
  video_timestamp_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_notes_timestamp_nonnegative check (video_timestamp_seconds >= 0)
);

create index if not exists lesson_notes_owner_course_lesson_idx
  on public.lesson_notes (user_id, course_id, lesson_id, video_timestamp_seconds);

alter table public.lesson_notes enable row level security;

drop policy if exists lesson_notes_owner_select on public.lesson_notes;
drop policy if exists lesson_notes_owner_insert on public.lesson_notes;
drop policy if exists lesson_notes_owner_update on public.lesson_notes;
drop policy if exists lesson_notes_owner_delete on public.lesson_notes;

create policy lesson_notes_owner_select
  on public.lesson_notes
  for select
  to authenticated
  using (user_id = auth.uid());

create policy lesson_notes_owner_insert
  on public.lesson_notes
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.can_read_course_lessons(course_id)
    and exists (
      select 1
      from public.course_lessons
      where id = lesson_notes.lesson_id
        and course_id = lesson_notes.course_id
    )
  );

create policy lesson_notes_owner_update
  on public.lesson_notes
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.can_read_course_lessons(course_id)
    and exists (
      select 1
      from public.course_lessons
      where id = lesson_notes.lesson_id
        and course_id = lesson_notes.course_id
    )
  );

create policy lesson_notes_owner_delete
  on public.lesson_notes
  for delete
  to authenticated
  using (user_id = auth.uid());

revoke all on public.lesson_notes from public, anon, authenticated;
grant select, insert, update, delete on public.lesson_notes to authenticated;
