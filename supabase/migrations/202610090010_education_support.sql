-- Private education support requests, volunteer offers, and admin-controlled matches.

do $$
begin
  create type public.education_support_need_type as enum ('free_tuition', 'books_materials');
exception when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.education_support_request_status as enum ('pending', 'approved', 'matched', 'rejected', 'closed');
exception when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.education_support_offer_status as enum ('pending', 'approved', 'inactive');
exception when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.education_support_match_status as enum ('active', 'closed');
exception when duplicate_object then null;
end;
$$;

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null check (char_length(btrim(student_name)) between 2 and 120),
  student_class text not null check (char_length(btrim(student_class)) between 1 and 80),
  district text not null check (char_length(btrim(district)) between 1 and 100),
  upazila text not null check (char_length(btrim(upazila)) between 1 and 100),
  need_type public.education_support_need_type not null,
  subjects text[] not null default '{}',
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  guardian_contact text not null check (char_length(btrim(guardian_contact)) between 5 and 100),
  verification_note text,
  status public.education_support_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint support_requests_subjects_limit check (cardinality(subjects) <= 20),
  constraint support_requests_verification_note_length check (verification_note is null or char_length(verification_note) <= 2000)
);

create table if not exists public.volunteer_offers (
  id uuid primary key default gen_random_uuid(),
  volunteer_user_id uuid not null references auth.users(id) on delete cascade,
  offer_type public.education_support_need_type not null,
  subjects text[] not null default '{}',
  districts text[] not null default '{}',
  available_days text not null check (char_length(btrim(available_days)) between 1 and 500),
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  status public.education_support_offer_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint volunteer_offers_subjects_limit check (cardinality(subjects) <= 20),
  constraint volunteer_offers_districts_limit check (cardinality(districts) <= 64)
);

create table if not exists public.support_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.support_requests(id) on delete cascade,
  offer_id uuid not null references public.volunteer_offers(id) on delete cascade,
  status public.education_support_match_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint support_matches_pair_unique unique (request_id, offer_id)
);

create unique index if not exists support_matches_one_active_request_idx
  on public.support_matches (request_id)
  where status = 'active';
create index if not exists support_requests_owner_created_idx
  on public.support_requests (requester_user_id, created_at desc);
create index if not exists support_requests_filters_idx
  on public.support_requests (status, district, student_class);
create index if not exists volunteer_offers_owner_created_idx
  on public.volunteer_offers (volunteer_user_id, created_at desc);
create index if not exists volunteer_offers_filters_idx
  on public.volunteer_offers (status, offer_type);
create index if not exists support_matches_offer_status_idx
  on public.support_matches (offer_id, status);

alter table public.support_requests enable row level security;
alter table public.volunteer_offers enable row level security;
alter table public.support_matches enable row level security;

drop policy if exists support_requests_owner_select on public.support_requests;
create policy support_requests_owner_select
  on public.support_requests for select to authenticated
  using (requester_user_id = auth.uid());
drop policy if exists support_requests_owner_insert on public.support_requests;
create policy support_requests_owner_insert
  on public.support_requests for insert to authenticated
  with check (requester_user_id = auth.uid() and status = 'pending' and verification_note is null);
drop policy if exists support_requests_admin_all on public.support_requests;
create policy support_requests_admin_all
  on public.support_requests for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists volunteer_offers_owner_select on public.volunteer_offers;
create policy volunteer_offers_owner_select
  on public.volunteer_offers for select to authenticated
  using (volunteer_user_id = auth.uid());
drop policy if exists volunteer_offers_owner_insert on public.volunteer_offers;
create policy volunteer_offers_owner_insert
  on public.volunteer_offers for insert to authenticated
  with check (volunteer_user_id = auth.uid() and status = 'pending');
drop policy if exists volunteer_offers_admin_all on public.volunteer_offers;
create policy volunteer_offers_admin_all
  on public.volunteer_offers for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists support_matches_admin_all on public.support_matches;
create policy support_matches_admin_all
  on public.support_matches for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.education_support_matched_contact(target_match_id uuid)
returns table (
  student_name text,
  student_class text,
  district text,
  upazila text,
  subjects text[],
  guardian_contact text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.support_matches as match
    join public.volunteer_offers as offer on offer.id = match.offer_id
    join public.support_requests as request on request.id = match.request_id
    where match.id = target_match_id
      and match.status = 'active'
      and offer.volunteer_user_id = auth.uid()
      and offer.status = 'approved'
      and request.status = 'matched'
  ) then
    raise exception 'এই সহায়তা অনুরোধের যোগাযোগের তথ্য দেখার অনুমতি নেই';
  end if;

  return query
  select request.student_name, request.student_class, request.district,
         request.upazila, request.subjects, request.guardian_contact
  from public.support_matches as match
  join public.support_requests as request on request.id = match.request_id
  join public.volunteer_offers as offer on offer.id = match.offer_id
  where match.id = target_match_id
    and match.status = 'active'
    and offer.volunteer_user_id = auth.uid()
    and offer.status = 'approved'
    and request.status = 'matched';
end;
$$;

create or replace function public.education_support_my_matches()
returns table (
  match_id uuid,
  offer_id uuid,
  student_name text,
  student_class text,
  district text,
  upazila text,
  subjects text[],
  guardian_contact text
)
language sql
security definer
stable
set search_path = public
as $$
  select match.id, offer.id, request.student_name, request.student_class,
         request.district, request.upazila, request.subjects, request.guardian_contact
  from public.support_matches as match
  join public.volunteer_offers as offer on offer.id = match.offer_id
  join public.support_requests as request on request.id = match.request_id
  where auth.uid() is not null
    and offer.volunteer_user_id = auth.uid()
    and offer.status = 'approved'
    and match.status = 'active'
    and request.status = 'matched';
$$;

create or replace function public.education_support_admin_create_match(target_request_id uuid, target_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.support_requests%rowtype;
  offer_row public.volunteer_offers%rowtype;
  new_match_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু অ্যাডমিন সহায়তার মিল তৈরি করতে পারবেন';
  end if;

  select * into request_row
  from public.support_requests
  where id = target_request_id
  for update;
  select * into offer_row
  from public.volunteer_offers
  where id = target_offer_id
  for update;

  if request_row.id is null or request_row.status <> 'approved'
     or offer_row.id is null or offer_row.status <> 'approved' then
    raise exception 'অনুমোদিত আবেদন ও স্বেচ্ছাসেবী প্রস্তাব নির্বাচন করুন';
  end if;
  if request_row.need_type <> offer_row.offer_type
     or (cardinality(offer_row.districts) > 0 and not (request_row.district = any(offer_row.districts)))
     or (request_row.need_type = 'free_tuition' and cardinality(offer_row.subjects) > 0
         and not (request_row.subjects && offer_row.subjects)) then
    raise exception 'আবেদন ও স্বেচ্ছাসেবী প্রস্তাবের ধরন, এলাকা বা বিষয় মিলছে না';
  end if;

  insert into public.support_matches (request_id, offer_id)
  values (request_row.id, offer_row.id)
  returning id into new_match_id;
  update public.support_requests
  set status = 'matched'
  where id = request_row.id;
  return new_match_id;
end;
$$;

revoke all on public.support_requests, public.volunteer_offers, public.support_matches from public, anon, authenticated;
grant select, insert, update on public.support_requests, public.volunteer_offers to authenticated;
grant select, insert, update, delete on public.support_matches to authenticated;
grant all on public.support_requests, public.volunteer_offers, public.support_matches to service_role;

revoke all on function public.education_support_matched_contact(uuid) from public, anon;
revoke all on function public.education_support_my_matches() from public, anon;
revoke all on function public.education_support_admin_create_match(uuid, uuid) from public, anon;
grant execute on function public.education_support_matched_contact(uuid),
  public.education_support_my_matches() to authenticated, service_role;
grant execute on function public.education_support_admin_create_match(uuid, uuid) to authenticated, service_role;
