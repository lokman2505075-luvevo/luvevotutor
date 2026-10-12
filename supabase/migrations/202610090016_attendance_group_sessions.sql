-- Allow a single tutor session to include multiple existing tuition bookings.
-- Run this in the Supabase SQL Editor after 202610090015_attendance_management.sql.

create table if not exists public.attendance_session_tuitions (
  session_id uuid not null
    references public.attendance_sessions(id) on delete cascade,
  tuition_id uuid not null
    references public.live_tuition_bookings(id) on delete cascade,
  primary key (session_id, tuition_id)
);

create index if not exists attendance_session_tuitions_tuition_idx
  on public.attendance_session_tuitions (tuition_id, session_id);

insert into public.attendance_session_tuitions (session_id, tuition_id)
select id, batch_or_tuition_id
from public.attendance_sessions
on conflict (session_id, tuition_id) do nothing;

create or replace function public.attendance_tutor_owns_session(
  target_session_id uuid
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
    where session.id = target_session_id
      and session.tutor_id = auth.uid()
      and public.attendance_tutor_owns_tuition(
        session.batch_or_tuition_id,
        auth.uid()
      )
  );
$$;

create or replace function public.attendance_student_can_read_session(
  target_session_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.attendance_session_tuitions as session_tuition
    join public.live_tuition_bookings as booking
      on booking.id = session_tuition.tuition_id
    where session_tuition.session_id = target_session_id
      and booking.student_id = auth.uid()
      and booking.status in ('approved', 'completed')
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
    join public.profiles as tutor on tutor.id = session.tutor_id
    join public.attendance_session_tuitions as session_tuition
      on session_tuition.session_id = session.id
    join public.live_tuition_bookings as booking
      on booking.id = session_tuition.tuition_id
    where session.id = target_session_id
      and session.tutor_id = auth.uid()
      and booking.tutor_id = auth.uid()
      and booking.student_id = target_student_id
      and booking.status in ('approved', 'completed')
      and tutor.role = 'tutor'
      and tutor.status = 'approved'
  );
$$;

revoke all on function public.attendance_tutor_can_manage_record(uuid, uuid)
  from public, anon;
revoke all on function public.attendance_tutor_owns_session(uuid)
  from public, anon;
revoke all on function public.attendance_student_can_read_session(uuid)
  from public, anon;
grant execute on function public.attendance_tutor_can_manage_record(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.attendance_tutor_owns_session(uuid)
  to authenticated, service_role;
grant execute on function public.attendance_student_can_read_session(uuid)
  to authenticated, service_role;

alter table public.attendance_session_tuitions enable row level security;

drop policy if exists attendance_sessions_select on public.attendance_sessions;
create policy attendance_sessions_select
  on public.attendance_sessions
  for select
  to authenticated
  using (
    public.is_admin()
    or public.attendance_tutor_owns_session(id)
    or public.attendance_student_can_read_session(id)
  );

drop policy if exists attendance_session_tuitions_select
  on public.attendance_session_tuitions;
drop policy if exists attendance_session_tuitions_insert
  on public.attendance_session_tuitions;
drop policy if exists attendance_session_tuitions_update
  on public.attendance_session_tuitions;
drop policy if exists attendance_session_tuitions_delete
  on public.attendance_session_tuitions;

create policy attendance_session_tuitions_select
  on public.attendance_session_tuitions
  for select
  to authenticated
  using (
    public.is_admin()
    or public.attendance_tutor_owns_session(session_id)
    or public.attendance_student_owns_tuition(tuition_id, auth.uid())
  );

create policy attendance_session_tuitions_insert
  on public.attendance_session_tuitions
  for insert
  to authenticated
  with check (
    public.attendance_tutor_owns_session(session_id)
    and public.attendance_tutor_owns_tuition(tuition_id, auth.uid())
    and exists (
      select 1 from public.live_tuition_bookings as booking
      where booking.id = attendance_session_tuitions.tuition_id
        and booking.student_id is not null
        and booking.status in ('approved', 'completed')
    )
  );

create policy attendance_session_tuitions_update
  on public.attendance_session_tuitions
  for update
  to authenticated
  using (
    public.attendance_tutor_owns_session(session_id)
  )
  with check (
    public.attendance_tutor_owns_session(session_id)
    and public.attendance_tutor_owns_tuition(tuition_id, auth.uid())
    and exists (
      select 1 from public.live_tuition_bookings as booking
      where booking.id = attendance_session_tuitions.tuition_id
        and booking.student_id is not null
        and booking.status in ('approved', 'completed')
    )
  );

create policy attendance_session_tuitions_delete
  on public.attendance_session_tuitions
  for delete
  to authenticated
  using (
    public.attendance_tutor_owns_session(session_id)
  );

create or replace function public.save_tutor_attendance_session(
  p_tutor_id uuid,
  p_session_id uuid,
  p_session_date date,
  p_start_time time,
  p_end_time time,
  p_topic text,
  p_tuition_ids uuid[],
  p_records jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_session_id uuid;
  tuition_count integer;
  student_count integer;
  record_count integer;
begin
  if not exists (
    select 1
    from public.profiles
    where id = p_tutor_id
      and role = 'tutor'
      and status = 'approved'
  ) then
    raise exception 'Tutor is not approved';
  end if;

  if p_tuition_ids is null
    or cardinality(p_tuition_ids) < 1
    or cardinality(p_tuition_ids) > 50
    or array_length(p_tuition_ids, 1) <> (
      select count(distinct tuition_id)::integer
      from unnest(p_tuition_ids) as selected(tuition_id)
    )
  then
    raise exception 'Invalid tuition selection';
  end if;

  select count(*)::integer, count(distinct student_id)::integer
    into tuition_count, student_count
  from public.live_tuition_bookings
  where id = any(p_tuition_ids)
    and tutor_id = p_tutor_id
    and student_id is not null
    and status in ('approved', 'completed');

  if tuition_count <> cardinality(p_tuition_ids)
    or student_count <> tuition_count
  then
    raise exception 'Tuition selection is not owned by tutor';
  end if;

  if p_records is null
    or jsonb_typeof(p_records) <> 'array'
    or jsonb_array_length(p_records) <> student_count
  then
    raise exception 'Attendance roster does not match tuition selection';
  end if;

  select count(distinct attendance_row.student_id)::integer, count(*)::integer
    into student_count, record_count
  from jsonb_to_recordset(p_records) as attendance_row(
    student_id uuid,
    status text,
    note text
  )
  where attendance_row.status in ('present', 'absent', 'late', 'excused')
    and (
      attendance_row.note is null
      or char_length(attendance_row.note) <= 500
    );

  if record_count <> jsonb_array_length(p_records)
    or student_count <> tuition_count
    or exists (
      select 1
      from jsonb_to_recordset(p_records) as attendance_row(
        student_id uuid,
        status text,
        note text
      )
      where not exists (
        select 1
        from public.live_tuition_bookings as booking
        where booking.id = any(p_tuition_ids)
          and booking.tutor_id = p_tutor_id
          and booking.student_id = attendance_row.student_id
          and booking.status in ('approved', 'completed')
      )
    )
  then
    raise exception 'Invalid attendance roster';
  end if;

  if p_topic is null or char_length(p_topic) > 300 then
    raise exception 'Invalid session topic';
  end if;

  if p_session_id is null then
    insert into public.attendance_sessions (
      tutor_id,
      batch_or_tuition_id,
      session_date,
      start_time,
      end_time,
      topic
    )
    values (
      p_tutor_id,
      p_tuition_ids[1],
      p_session_date,
      p_start_time,
      p_end_time,
      p_topic
    )
    returning id into saved_session_id;
  else
    update public.attendance_sessions
    set batch_or_tuition_id = p_tuition_ids[1],
        session_date = p_session_date,
        start_time = p_start_time,
        end_time = p_end_time,
        topic = p_topic
    where id = p_session_id
      and tutor_id = p_tutor_id
    returning id into saved_session_id;

    if saved_session_id is null then
      raise exception 'Session is not owned by tutor';
    end if;

    delete from public.attendance_records
    where session_id = saved_session_id;
    delete from public.attendance_session_tuitions
    where session_id = saved_session_id;
  end if;

  insert into public.attendance_session_tuitions (session_id, tuition_id)
  select saved_session_id, selected.tuition_id
  from unnest(p_tuition_ids) as selected(tuition_id);

  insert into public.attendance_records (
    session_id,
    student_id,
    status,
    note,
    marked_at
  )
  select
    saved_session_id,
    attendance_row.student_id,
    attendance_row.status,
    nullif(attendance_row.note, ''),
    now()
  from jsonb_to_recordset(p_records) as attendance_row(
    student_id uuid,
    status text,
    note text
  );

  return saved_session_id;
end;
$$;

revoke all on function public.save_tutor_attendance_session(
  uuid, uuid, date, time, time, text, uuid[], jsonb
) from public, anon, authenticated;
grant execute on function public.save_tutor_attendance_session(
  uuid, uuid, date, time, time, text, uuid[], jsonb
) to service_role;

revoke all on public.attendance_session_tuitions from public, anon, authenticated;
grant select, insert, update, delete
  on public.attendance_session_tuitions to authenticated;
grant all on public.attendance_session_tuitions to service_role;
