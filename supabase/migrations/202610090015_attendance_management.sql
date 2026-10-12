-- Track private attendance for approved live tuition bookings.
-- Run this in the Supabase SQL Editor after the existing live tuition schema.

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references auth.users(id) on delete cascade,
  batch_or_tuition_id uuid not null
    references public.live_tuition_bookings(id) on delete cascade,
  session_date date not null,
  start_time time not null,
  end_time time,
  topic text not null default '',
  created_at timestamptz not null default now(),
  constraint attendance_sessions_time_order check (
    end_time is null or end_time > start_time
  )
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status text not null
    check (status in ('present', 'absent', 'late', 'excused')),
  note text,
  marked_at timestamptz not null default now(),
  constraint attendance_records_session_student_unique
    unique (session_id, student_id)
);

create index if not exists attendance_sessions_tutor_date_idx
  on public.attendance_sessions (tutor_id, session_date desc);

create index if not exists attendance_sessions_tuition_date_idx
  on public.attendance_sessions (batch_or_tuition_id, session_date desc);

create index if not exists attendance_records_student_marked_idx
  on public.attendance_records (student_id, marked_at desc);

create or replace function public.attendance_tutor_owns_tuition(
  target_tuition_id uuid,
  target_tutor_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.live_tuition_bookings as booking
    join public.profiles as tutor on tutor.id = booking.tutor_id
    where booking.id = target_tuition_id
      and booking.tutor_id = target_tutor_id
      and booking.student_id is not null
      and booking.status in ('approved', 'completed')
      and tutor.role = 'tutor'
      and tutor.status = 'approved'
  );
$$;

create or replace function public.attendance_student_owns_tuition(
  target_tuition_id uuid,
  target_student_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.live_tuition_bookings as booking
    join public.profiles as student on student.id = booking.student_id
    where booking.id = target_tuition_id
      and booking.student_id = target_student_id
      and booking.status in ('approved', 'completed')
      and student.role = 'student'
  );
$$;

create or replace function public.attendance_tutor_can_manage_record(
  target_session_id uuid,
  target_student_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.attendance_sessions as session
    join public.live_tuition_bookings as booking
      on booking.id = session.batch_or_tuition_id
    join public.profiles as tutor on tutor.id = session.tutor_id
    where session.id = target_session_id
      and session.tutor_id = auth.uid()
      and booking.tutor_id = auth.uid()
      and booking.student_id = target_student_id
      and booking.status in ('approved', 'completed')
      and tutor.role = 'tutor'
      and tutor.status = 'approved'
  );
$$;

revoke all on function public.attendance_tutor_owns_tuition(uuid, uuid)
  from public, anon;
revoke all on function public.attendance_student_owns_tuition(uuid, uuid)
  from public, anon;
revoke all on function public.attendance_tutor_can_manage_record(uuid, uuid)
  from public, anon;
grant execute on function public.attendance_tutor_owns_tuition(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.attendance_student_owns_tuition(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.attendance_tutor_can_manage_record(uuid, uuid)
  to authenticated, service_role;

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists attendance_sessions_select on public.attendance_sessions;
drop policy if exists attendance_sessions_insert on public.attendance_sessions;
drop policy if exists attendance_sessions_update on public.attendance_sessions;
drop policy if exists attendance_records_select on public.attendance_records;
drop policy if exists attendance_records_insert on public.attendance_records;
drop policy if exists attendance_records_update on public.attendance_records;

create policy attendance_sessions_select
  on public.attendance_sessions
  for select
  to authenticated
  using (
    public.is_admin()
    or (
      tutor_id = auth.uid()
      and public.attendance_tutor_owns_tuition(batch_or_tuition_id, auth.uid())
    )
    or public.attendance_student_owns_tuition(batch_or_tuition_id, auth.uid())
  );

create policy attendance_sessions_insert
  on public.attendance_sessions
  for insert
  to authenticated
  with check (
    tutor_id = auth.uid()
    and public.attendance_tutor_owns_tuition(batch_or_tuition_id, auth.uid())
  );

create policy attendance_sessions_update
  on public.attendance_sessions
  for update
  to authenticated
  using (
    tutor_id = auth.uid()
    and public.attendance_tutor_owns_tuition(batch_or_tuition_id, auth.uid())
  )
  with check (
    tutor_id = auth.uid()
    and public.attendance_tutor_owns_tuition(batch_or_tuition_id, auth.uid())
  );

create policy attendance_records_select
  on public.attendance_records
  for select
  to authenticated
  using (
    public.is_admin()
    or student_id = auth.uid()
    or public.attendance_tutor_can_manage_record(session_id, student_id)
  );

create policy attendance_records_insert
  on public.attendance_records
  for insert
  to authenticated
  with check (
    public.attendance_tutor_can_manage_record(session_id, student_id)
  );

create policy attendance_records_update
  on public.attendance_records
  for update
  to authenticated
  using (
    public.attendance_tutor_can_manage_record(session_id, student_id)
  )
  with check (
    public.attendance_tutor_can_manage_record(session_id, student_id)
  );

revoke all on public.attendance_sessions, public.attendance_records
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.attendance_sessions, public.attendance_records to authenticated;
grant all on public.attendance_sessions, public.attendance_records to service_role;

create or replace view public.attendance_student_summary
with (security_invoker = true)
as
select
  record.student_id,
  count(*)::bigint as total_sessions,
  count(*) filter (where record.status = 'present')::bigint as present,
  count(*) filter (where record.status = 'absent')::bigint as absent,
  count(*) filter (where record.status = 'late')::bigint as late,
  count(*) filter (where record.status = 'excused')::bigint as excused,
  coalesce(
    round(
      100.0 * count(*) filter (where record.status in ('present', 'late'))
      / nullif(count(*), 0),
      2
    ),
    0
  ) as attendance_percentage
from public.attendance_records as record
join public.attendance_sessions as session on session.id = record.session_id
group by record.student_id;

revoke all on public.attendance_student_summary from public, anon, authenticated;
grant select on public.attendance_student_summary to authenticated;
grant all on public.attendance_student_summary to service_role;
