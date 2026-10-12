-- Add tutor-managed students and secure their attendance records.
-- Run in the Supabase SQL Editor after 202610090016_attendance_group_sessions.sql.

begin;

create table if not exists public.tutor_students (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references auth.users(id) on delete set null,
  display_name text not null check (char_length(btrim(display_name)) > 0),
  phone text,
  class_level text not null check (char_length(btrim(class_level)) > 0),
  subject text not null check (char_length(btrim(subject)) > 0),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  source text not null default 'manual'
    check (source in ('manual', 'invite', 'booking')),
  created_at timestamptz not null default now(),
  constraint tutor_students_id_tutor_unique unique (id, tutor_id)
);

create unique index if not exists tutor_students_tutor_student_unique
  on public.tutor_students (tutor_id, student_id)
  where student_id is not null;

create index if not exists tutor_students_tutor_status_created_idx
  on public.tutor_students (tutor_id, status, created_at desc);

create table if not exists public.tutor_student_invites (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references auth.users(id) on delete cascade,
  tutor_student_id uuid not null,
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tutor_student_invites_owner_student_fkey
    foreign key (tutor_student_id, tutor_id)
    references public.tutor_students(id, tutor_id) on delete cascade
);

create index if not exists tutor_student_invites_owner_created_idx
  on public.tutor_student_invites (tutor_id, created_at desc);

create index if not exists tutor_student_invites_expiry_idx
  on public.tutor_student_invites (expires_at)
  where used_at is null;

alter table public.attendance_records
  alter column student_id drop not null,
  add column if not exists tutor_student_id uuid
    references public.tutor_students(id) on delete cascade;

alter table public.attendance_records
  drop constraint if exists attendance_records_student_reference_check;
alter table public.attendance_records
  add constraint attendance_records_student_reference_check
  check (student_id is not null or tutor_student_id is not null);

create unique index if not exists attendance_records_session_tutor_student_unique
  on public.attendance_records (session_id, tutor_student_id)
  where tutor_student_id is not null;

create index if not exists attendance_records_tutor_student_marked_idx
  on public.attendance_records (tutor_student_id, marked_at desc)
  where tutor_student_id is not null;

create or replace function public.attendance_is_approved_tutor()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'tutor'
      and status = 'approved'
  );
$$;

create or replace function public.attendance_tutor_can_manage_manual_record(
  target_session_id uuid,
  target_tutor_student_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select public.attendance_is_approved_tutor()
    and exists (
      select 1
      from public.attendance_sessions as session
      join public.tutor_students as tutor_student
        on tutor_student.tutor_id = session.tutor_id
      where session.id = target_session_id
        and session.tutor_id = auth.uid()
        and tutor_student.id = target_tutor_student_id
    );
$$;

create or replace function public.attendance_student_owns_manual_record(
  target_tutor_student_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.tutor_students as tutor_student
    where tutor_student.id = target_tutor_student_id
      and tutor_student.student_id = auth.uid()
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
  )
  or exists (
    select 1
    from public.attendance_records as record
    where record.session_id = target_session_id
      and (
        record.student_id = auth.uid()
        or public.attendance_student_owns_manual_record(
          record.tutor_student_id
        )
      )
  );
$$;

revoke all on function public.attendance_is_approved_tutor()
  from public, anon;
revoke all on function public.attendance_tutor_can_manage_manual_record(uuid, uuid)
  from public, anon;
revoke all on function public.attendance_student_owns_manual_record(uuid)
  from public, anon;
revoke all on function public.attendance_student_can_read_session(uuid)
  from public, anon;
grant execute on function public.attendance_is_approved_tutor()
  to authenticated, service_role;
grant execute on function public.attendance_tutor_can_manage_manual_record(uuid, uuid)
  to authenticated, service_role;
grant execute on function public.attendance_student_owns_manual_record(uuid)
  to authenticated, service_role;
grant execute on function public.attendance_student_can_read_session(uuid)
  to authenticated, service_role;

alter table public.tutor_students enable row level security;
alter table public.tutor_student_invites enable row level security;

drop policy if exists tutor_students_select on public.tutor_students;
drop policy if exists tutor_students_insert on public.tutor_students;
drop policy if exists tutor_students_update on public.tutor_students;
create policy tutor_students_select
  on public.tutor_students
  for select
  to authenticated
  using (public.is_admin() or tutor_id = auth.uid());
create policy tutor_students_insert
  on public.tutor_students
  for insert
  to authenticated
  with check (
    tutor_id = auth.uid()
    and source = 'manual'
    and student_id is null
    and public.attendance_is_approved_tutor()
  );
create policy tutor_students_update
  on public.tutor_students
  for update
  to authenticated
  using (
    tutor_id = auth.uid()
    and public.attendance_is_approved_tutor()
  )
  with check (
    tutor_id = auth.uid()
    and public.attendance_is_approved_tutor()
  );

drop policy if exists tutor_student_invites_select
  on public.tutor_student_invites;
drop policy if exists tutor_student_invites_insert
  on public.tutor_student_invites;
drop policy if exists tutor_student_invites_update
  on public.tutor_student_invites;
drop policy if exists tutor_student_invites_delete
  on public.tutor_student_invites;
create policy tutor_student_invites_select
  on public.tutor_student_invites
  for select
  to authenticated
  using (public.is_admin() or tutor_id = auth.uid());
create policy tutor_student_invites_insert
  on public.tutor_student_invites
  for insert
  to authenticated
  with check (
    tutor_id = auth.uid()
    and public.attendance_is_approved_tutor()
    and exists (
      select 1
      from public.tutor_students as tutor_student
      where tutor_student.id = tutor_student_invites.tutor_student_id
        and tutor_student.tutor_id = auth.uid()
    )
  );
create policy tutor_student_invites_update
  on public.tutor_student_invites
  for update
  to authenticated
  using (
    tutor_id = auth.uid()
    and public.attendance_is_approved_tutor()
  )
  with check (
    tutor_id = auth.uid()
    and public.attendance_is_approved_tutor()
    and exists (
      select 1
      from public.tutor_students as tutor_student
      where tutor_student.id = tutor_student_invites.tutor_student_id
        and tutor_student.tutor_id = auth.uid()
    )
  );
create policy tutor_student_invites_delete
  on public.tutor_student_invites
  for delete
  to authenticated
  using (
    tutor_id = auth.uid()
    and public.attendance_is_approved_tutor()
  );

revoke all on public.tutor_students, public.tutor_student_invites
  from public, anon, authenticated;
grant select on public.tutor_students to authenticated;
grant insert (tutor_id, display_name, phone, class_level, subject)
  on public.tutor_students to authenticated;
grant update (display_name, phone, class_level, subject, status)
  on public.tutor_students to authenticated;
grant select (
  id, tutor_id, tutor_student_id, expires_at, used_at, created_at
) on public.tutor_student_invites to authenticated;
grant delete on public.tutor_student_invites to authenticated;
grant all on public.tutor_students, public.tutor_student_invites
  to service_role;

drop policy if exists attendance_records_select on public.attendance_records;
drop policy if exists attendance_records_insert on public.attendance_records;
drop policy if exists attendance_records_update on public.attendance_records;
create policy attendance_records_select
  on public.attendance_records
  for select
  to authenticated
  using (
    public.is_admin()
    or student_id = auth.uid()
    or public.attendance_student_owns_manual_record(tutor_student_id)
    or public.attendance_tutor_can_manage_record(session_id, student_id)
    or public.attendance_tutor_can_manage_manual_record(
      session_id,
      tutor_student_id
    )
  );
create policy attendance_records_insert
  on public.attendance_records
  for insert
  to authenticated
  with check (
    (
      tutor_student_id is null
      and public.attendance_tutor_can_manage_record(session_id, student_id)
    )
    or (
      tutor_student_id is not null
      and public.attendance_tutor_can_manage_manual_record(
        session_id,
        tutor_student_id
      )
      and (
        student_id is null
        or exists (
          select 1
          from public.tutor_students as tutor_student
          where tutor_student.id = attendance_records.tutor_student_id
            and tutor_student.student_id = attendance_records.student_id
        )
      )
    )
  );

create policy attendance_records_update
  on public.attendance_records
  for update
  to authenticated
  using (
    (
      tutor_student_id is null
      and public.attendance_tutor_can_manage_record(session_id, student_id)
    )
    or public.attendance_tutor_can_manage_manual_record(
      session_id,
      tutor_student_id
    )
  )
  with check (
    (
      tutor_student_id is null
      and public.attendance_tutor_can_manage_record(session_id, student_id)
    )
    or (
      tutor_student_id is not null
      and public.attendance_tutor_can_manage_manual_record(
        session_id,
        tutor_student_id
      )
      and (
        student_id is null
        or exists (
          select 1
          from public.tutor_students as tutor_student
          where tutor_student.id = attendance_records.tutor_student_id
            and tutor_student.student_id = attendance_records.student_id
        )
      )
    )
  );

commit;
