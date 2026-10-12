-- Allow attendance sessions containing manual students without bookings.
-- Run after 202610090017_manual_attendance_students.sql.

begin;

alter table public.attendance_sessions
  alter column batch_or_tuition_id drop not null;

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
    join public.profiles as tutor on tutor.id = session.tutor_id
    where session.id = target_session_id
      and session.tutor_id = auth.uid()
      and tutor.role = 'tutor'
      and tutor.status = 'approved'
  );
$$;

drop function if exists public.save_tutor_attendance_session(
  uuid, uuid, date, time, time, text, uuid[], jsonb
);

create or replace function public.save_tutor_attendance_session(
  p_tutor_id uuid,
  p_session_id uuid,
  p_session_date date,
  p_start_time time,
  p_end_time time,
  p_topic text,
  p_tuition_ids uuid[],
  p_tutor_student_ids uuid[],
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
  booking_student_count integer;
  manual_student_count integer;
  expected_record_count integer;
  valid_record_count integer;
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
    or cardinality(p_tuition_ids) > 50
    or cardinality(p_tuition_ids) <> (
      select count(distinct selected.tuition_id)::integer
      from unnest(p_tuition_ids) as selected(tuition_id)
    )
    or p_tutor_student_ids is null
    or cardinality(p_tutor_student_ids) > 200
    or cardinality(p_tutor_student_ids) <> (
      select count(distinct selected.tutor_student_id)::integer
      from unnest(p_tutor_student_ids) as selected(tutor_student_id)
    )
    or (
      cardinality(p_tuition_ids) = 0
      and cardinality(p_tutor_student_ids) = 0
    )
  then
    raise exception 'Invalid attendance roster selection';
  end if;

  select count(*)::integer, count(distinct booking.student_id)::integer
    into tuition_count, booking_student_count
  from public.live_tuition_bookings as booking
  where booking.id = any(p_tuition_ids)
    and booking.tutor_id = p_tutor_id
    and booking.student_id is not null
    and booking.status in ('approved', 'completed');

  if tuition_count <> cardinality(p_tuition_ids)
    or booking_student_count <> tuition_count
  then
    raise exception 'Tuition selection is not owned by tutor';
  end if;

  select count(*)::integer
    into manual_student_count
  from public.tutor_students as tutor_student
  where tutor_student.id = any(p_tutor_student_ids)
    and tutor_student.tutor_id = p_tutor_id
    and tutor_student.status = 'active';

  if manual_student_count <> cardinality(p_tutor_student_ids) then
    raise exception 'Manual student selection is not owned by tutor';
  end if;

  expected_record_count := booking_student_count + manual_student_count;
  if p_records is null
    or jsonb_typeof(p_records) <> 'array'
    or jsonb_array_length(p_records) <> expected_record_count
  then
    raise exception 'Attendance roster does not match selection';
  end if;

  select count(*)::integer
    into valid_record_count
  from jsonb_to_recordset(p_records) as attendance_row(
    student_id uuid,
    tutor_student_id uuid,
    status text,
    note text
  )
  where (attendance_row.student_id is null)
      <> (attendance_row.tutor_student_id is null)
    and attendance_row.status in ('present', 'absent', 'late', 'excused')
    and (
      attendance_row.note is null
      or char_length(attendance_row.note) <= 500
    )
    and (
      (
        attendance_row.student_id is not null
        and exists (
          select 1
          from public.live_tuition_bookings as booking
          where booking.id = any(p_tuition_ids)
            and booking.tutor_id = p_tutor_id
            and booking.student_id = attendance_row.student_id
            and booking.status in ('approved', 'completed')
        )
      )
      or (
        attendance_row.tutor_student_id is not null
        and attendance_row.tutor_student_id = any(p_tutor_student_ids)
        and exists (
          select 1
          from public.tutor_students as tutor_student
          where tutor_student.id = attendance_row.tutor_student_id
            and tutor_student.tutor_id = p_tutor_id
            and tutor_student.status = 'active'
        )
      )
    );

  if valid_record_count <> expected_record_count
    or (
      select count(distinct attendance_row.student_id)::integer
      from jsonb_to_recordset(p_records) as attendance_row(
        student_id uuid,
        tutor_student_id uuid,
        status text,
        note text
      )
      where attendance_row.student_id is not null
    ) <> booking_student_count
    or (
      select count(distinct attendance_row.tutor_student_id)::integer
      from jsonb_to_recordset(p_records) as attendance_row(
        student_id uuid,
        tutor_student_id uuid,
        status text,
        note text
      )
      where attendance_row.tutor_student_id is not null
    ) <> manual_student_count
  then
    raise exception 'Invalid attendance roster';
  end if;

  if p_topic is null or char_length(p_topic) > 300
    or p_end_time is not null and p_end_time <= p_start_time
  then
    raise exception 'Invalid session details';
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
    tutor_student_id,
    status,
    note,
    marked_at
  )
  select
    saved_session_id,
    attendance_row.student_id,
    attendance_row.tutor_student_id,
    attendance_row.status,
    nullif(attendance_row.note, ''),
    now()
  from jsonb_to_recordset(p_records) as attendance_row(
    student_id uuid,
    tutor_student_id uuid,
    status text,
    note text
  );

  return saved_session_id;
end;
$$;

revoke all on function public.save_tutor_attendance_session(
  uuid, uuid, date, time, time, text, uuid[], uuid[], jsonb
) from public, anon, authenticated;
grant execute on function public.save_tutor_attendance_session(
  uuid, uuid, date, time, time, text, uuid[], uuid[], jsonb
) to service_role;

commit;
