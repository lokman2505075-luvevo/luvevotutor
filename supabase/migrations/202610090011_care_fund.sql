-- Private application workflow and append-only ledger for the Luvevo Care Fund.

do $$
begin
  create type public.care_fund_entry_type as enum ('contribution', 'disbursement');
exception when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.care_requester_type as enum ('student', 'tutor');
exception when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.care_need_category as enum (
    'books', 'tuition_fee', 'exam_fee', 'medical', 'emergency', 'other'
  );
exception when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.care_request_status as enum ('pending', 'approved', 'rejected', 'paid');
exception when duplicate_object then null;
end;
$$;

create table if not exists public.care_fund_settings (
  id uuid primary key default gen_random_uuid(),
  contribution_percent numeric(5, 2) not null default 0
    check (contribution_percent between 0 and 100),
  applies_to text[] not null default '{}',
  notes text,
  per_person_yearly_cap numeric(12, 2) not null default 0
    check (per_person_yearly_cap >= 0),
  updated_at timestamptz not null default now(),
  constraint care_fund_settings_singleton check (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

insert into public.care_fund_settings (id, contribution_percent, applies_to, notes, per_person_yearly_cap)
values ('00000000-0000-0000-0000-000000000001', 0, '{}', 'প্রশাসক অবদানের হার ও বাৎসরিক সহায়তা সীমা নির্ধারণ করবেন।', 0)
on conflict (id) do nothing;

create table if not exists public.care_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users(id) on delete cascade,
  requester_type public.care_requester_type not null,
  need_category public.care_need_category not null,
  amount_requested numeric(12, 2) not null check (amount_requested > 0),
  description text not null check (char_length(btrim(description)) between 10 and 3000),
  district text not null check (char_length(btrim(district)) between 1 and 100),
  proof_files text[] not null default '{}',
  status public.care_request_status not null default 'pending',
  admin_note text,
  amount_approved numeric(12, 2) check (amount_approved is null or amount_approved > 0),
  created_at timestamptz not null default now(),
  constraint care_requests_proof_count check (cardinality(proof_files) between 1 and 5),
  constraint care_requests_admin_note_length check (admin_note is null or char_length(admin_note) <= 2000)
);

create table if not exists public.care_fund_ledger (
  id uuid primary key default gen_random_uuid(),
  entry_type public.care_fund_entry_type not null,
  amount numeric(12, 2) not null check (amount > 0),
  source_ref text not null check (char_length(btrim(source_ref)) between 1 and 200),
  recipient_request_id uuid references public.care_requests(id) on delete restrict,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint care_fund_ledger_note_length check (note is null or char_length(note) <= 2000)
);

create unique index if not exists care_fund_ledger_request_disbursement_idx
  on public.care_fund_ledger (recipient_request_id)
  where entry_type = 'disbursement' and recipient_request_id is not null;
create index if not exists care_requests_owner_created_idx
  on public.care_requests (requester_user_id, created_at desc);
create index if not exists care_requests_admin_filter_idx
  on public.care_requests (status, requester_type, need_category, district, created_at desc);
create index if not exists care_fund_ledger_created_idx
  on public.care_fund_ledger (created_at, id);

alter table public.care_fund_settings enable row level security;
alter table public.care_fund_ledger enable row level security;
alter table public.care_requests enable row level security;

drop policy if exists care_fund_settings_admin_select on public.care_fund_settings;
create policy care_fund_settings_admin_select
  on public.care_fund_settings for select to authenticated
  using (public.is_admin());
drop policy if exists care_fund_settings_admin_update on public.care_fund_settings;
create policy care_fund_settings_admin_update
  on public.care_fund_settings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists care_fund_ledger_admin_select on public.care_fund_ledger;
create policy care_fund_ledger_admin_select
  on public.care_fund_ledger for select to authenticated
  using (public.is_admin());

drop policy if exists care_requests_owner_select on public.care_requests;
create policy care_requests_owner_select
  on public.care_requests for select to authenticated
  using (requester_user_id = auth.uid());
drop policy if exists care_requests_owner_insert on public.care_requests;
create policy care_requests_owner_insert
  on public.care_requests for insert to authenticated
  with check (
    requester_user_id = auth.uid()
    and status = 'pending'
    and admin_note is null
    and amount_approved is null
  );
drop policy if exists care_requests_admin_select on public.care_requests;
create policy care_requests_admin_select
  on public.care_requests for select to authenticated
  using (public.is_admin());

create or replace view public.care_fund_public_stats
with (security_invoker = false)
as
select
  coalesce(sum(ledger.amount) filter (where ledger.entry_type = 'contribution'), 0)::numeric(14, 2) as total_contributed,
  coalesce(sum(ledger.amount) filter (where ledger.entry_type = 'disbursement'), 0)::numeric(14, 2) as total_disbursed,
  count(distinct ledger.recipient_request_id) filter (
    where ledger.entry_type = 'disbursement' and ledger.recipient_request_id is not null
  )::bigint as people_helped
from public.care_fund_ledger as ledger;

create or replace function public.care_fund_admin_approve_request(
  target_request_id uuid,
  approved_amount numeric,
  decision_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_row public.care_fund_settings%rowtype;
  request_row public.care_requests%rowtype;
  available_amount numeric(14, 2);
  yearly_total numeric(14, 2);
  year_start timestamptz := date_trunc('year', now());
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু প্রশাসক আবেদন অনুমোদন করতে পারবেন';
  end if;
  select * into settings_row from public.care_fund_settings
    where id = '00000000-0000-0000-0000-000000000001'::uuid for update;
  select * into request_row from public.care_requests
    where id = target_request_id for update;
  if request_row.id is null or request_row.status <> 'pending' then
    raise exception 'শুধু অপেক্ষমাণ আবেদন অনুমোদন করা যাবে';
  end if;
  if approved_amount is null or approved_amount <= 0 or approved_amount > request_row.amount_requested then
    raise exception 'অনুমোদিত অর্থের পরিমাণ আবেদনের চেয়ে বেশি বা সঠিক নয়';
  end if;
  if settings_row.per_person_yearly_cap <= 0 then
    raise exception 'আগে সেটিংসে বাৎসরিক ব্যক্তি-প্রতি সহায়তার সীমা নির্ধারণ করুন';
  end if;

  select coalesce(sum(entry.amount) filter (where entry.entry_type = 'contribution'), 0)
       - coalesce(sum(entry.amount) filter (where entry.entry_type = 'disbursement'), 0)
  into available_amount
  from public.care_fund_ledger as entry;
  select available_amount - coalesce(sum(request.amount_approved), 0)
  into available_amount
  from public.care_requests as request
  where request.status = 'approved';
  if approved_amount > available_amount then
    raise exception 'বর্তমান তহবিলের অবশিষ্ট অর্থের চেয়ে বেশি অনুমোদন করা যাবে না';
  end if;

  select coalesce(sum(request.amount_approved), 0)
  into yearly_total
  from public.care_requests as request
  where request.requester_user_id = request_row.requester_user_id
    and request.created_at >= year_start
    and request.status in ('approved', 'paid');
  if yearly_total + approved_amount > settings_row.per_person_yearly_cap then
    raise exception 'আবেদনকারীর বাৎসরিক সহায়তা সীমা অতিক্রম হবে';
  end if;

  update public.care_requests
  set status = 'approved',
      amount_approved = approved_amount,
      admin_note = nullif(btrim(decision_note), '')
  where id = request_row.id;
end;
$$;

create or replace function public.care_fund_admin_reject_request(
  target_request_id uuid,
  rejection_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু প্রশাসক আবেদন প্রত্যাখ্যান করতে পারবেন';
  end if;
  if rejection_reason is null or char_length(btrim(rejection_reason)) not between 1 and 2000 then
    raise exception 'প্রত্যাখ্যানের কারণ লিখুন';
  end if;
  update public.care_requests
  set status = 'rejected', admin_note = btrim(rejection_reason), amount_approved = null
  where id = target_request_id and status = 'pending';
  if not found then
    raise exception 'শুধু অপেক্ষমাণ আবেদন প্রত্যাখ্যান করা যাবে';
  end if;
end;
$$;

create or replace function public.care_fund_admin_mark_paid(
  target_request_id uuid,
  transaction_reference text,
  payment_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.care_requests%rowtype;
  new_entry_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু প্রশাসক সহায়তা পরিশোধ রেকর্ড করতে পারবেন';
  end if;
  if transaction_reference is null or char_length(btrim(transaction_reference)) not between 1 and 200 then
    raise exception 'লেনদেনের রেফারেন্স লিখুন';
  end if;
  select * into request_row from public.care_requests
    where id = target_request_id for update;
  if request_row.id is null or request_row.status <> 'approved'
     or request_row.amount_approved is null then
    raise exception 'শুধু অনুমোদিত আবেদন পরিশোধ করা যাবে';
  end if;

  insert into public.care_fund_ledger (
    entry_type, amount, source_ref, recipient_request_id, note, created_by
  ) values (
    'disbursement', request_row.amount_approved, btrim(transaction_reference),
    request_row.id, nullif(btrim(payment_note), ''), auth.uid()
  ) returning id into new_entry_id;

  update public.care_requests set status = 'paid' where id = request_row.id;
  return new_entry_id;
end;
$$;

create or replace function public.care_fund_admin_add_contribution(
  contribution_amount numeric,
  contribution_reference text,
  contribution_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_entry_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু প্রশাসক তহবিলের অবদান রেকর্ড করতে পারবেন';
  end if;
  if contribution_amount is null or contribution_amount <= 0
     or contribution_reference is null
     or char_length(btrim(contribution_reference)) not between 1 and 200
     or char_length(coalesce(contribution_note, '')) > 2000 then
    raise exception 'অবদানের পরিমাণ বা রেফারেন্স সঠিক নয়';
  end if;
  insert into public.care_fund_ledger (
    entry_type, amount, source_ref, note, created_by
  ) values (
    'contribution', contribution_amount, btrim(contribution_reference),
    nullif(btrim(contribution_note), ''), auth.uid()
  ) returning id into new_entry_id;
  return new_entry_id;
end;
$$;

revoke all on public.care_fund_settings, public.care_fund_ledger, public.care_requests from public, anon, authenticated;
grant select, update on public.care_fund_settings to authenticated;
grant select on public.care_fund_ledger, public.care_requests to authenticated;
grant insert on public.care_requests to authenticated;
grant all on public.care_fund_settings, public.care_fund_ledger, public.care_requests to service_role;

revoke all on public.care_fund_public_stats from public, anon, authenticated;
grant select on public.care_fund_public_stats to anon, authenticated, service_role;

revoke all on function public.care_fund_admin_approve_request(uuid, numeric, text) from public, anon;
revoke all on function public.care_fund_admin_reject_request(uuid, text) from public, anon;
revoke all on function public.care_fund_admin_mark_paid(uuid, text, text) from public, anon;
revoke all on function public.care_fund_admin_add_contribution(numeric, text, text) from public, anon;
grant execute on function public.care_fund_admin_approve_request(uuid, numeric, text),
  public.care_fund_admin_reject_request(uuid, text),
  public.care_fund_admin_mark_paid(uuid, text, text),
  public.care_fund_admin_add_contribution(numeric, text, text)
  to authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'care-fund-proofs',
  'care-fund-proofs',
  false,
  8388608,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists care_fund_proofs_owner_insert on storage.objects;
create policy care_fund_proofs_owner_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'care-fund-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists care_fund_proofs_owner_or_admin_select on storage.objects;
create policy care_fund_proofs_owner_or_admin_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'care-fund-proofs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
drop policy if exists care_fund_proofs_owner_delete on storage.objects;
create policy care_fund_proofs_owner_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'care-fund-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

grant select on storage.objects to authenticated;
grant insert, delete on storage.objects to authenticated;
