-- Sohojatri: additive schema for moderated, institution-aware group posts.
-- Existing study_groups rows and legacy columns are retained.

alter table public.profiles
  add column if not exists institution_type text,
  add column if not exists institution_name text,
  add column if not exists level text,
  add column if not exists birth_date date;

alter table public.profiles
  drop constraint if exists profiles_sohojatri_institution_type_check,
  drop constraint if exists profiles_sohojatri_level_check,
  add constraint profiles_sohojatri_institution_type_check
    check (institution_type is null or institution_type in ('school', 'college', 'university', 'coaching', 'other')),
  add constraint profiles_sohojatri_level_check
    check (level is null or level in ('class_6_8', 'ssc', 'hsc', 'admission', 'undergraduate', 'postgraduate', 'other'));

alter table public.study_groups
  add column if not exists user_id uuid references public.profiles(id) on delete set null,
  add column if not exists title text,
  add column if not exists category text not null default 'other',
  add column if not exists institution_type text,
  add column if not exists institution_name text,
  add column if not exists level text,
  add column if not exists audience text not null default 'all',
  add column if not exists district text,
  add column if not exists is_online boolean not null default false,
  add column if not exists event_date date,
  add column if not exists estimated_cost numeric(12, 2),
  add column if not exists max_members integer,
  add column if not exists current_members integer not null default 1,
  add column if not exists requirements text,
  add column if not exists guardian_confirmed boolean not null default false,
  add column if not exists rejection_reason text;

update public.study_groups
set institution_type = coalesce(institution_type, 'university'),
    institution_name = coalesce(institution_name, university),
    title = coalesce(nullif(title, ''), nullif(subject, ''), 'পুরোনো সহযাত্রী পোস্ট'),
    category = coalesce(category, 'other'),
    audience = coalesce(audience, 'all'),
    current_members = least(500, greatest(coalesce(current_members, 1), 1));

update public.study_groups
set max_members = least(
  500,
  greatest(
    2,
    current_members,
    coalesce(
      max_members,
      case
        when coalesce(members_needed::text, '') ~ '^[0-9]{1,3}$'
          then members_needed::text::integer + 1
        else 5
      end
    )
  )
);

alter table public.study_groups
  alter column title set not null,
  alter column institution_type set default 'other',
  alter column institution_type set not null,
  alter column max_members set default 5,
  alter column max_members set not null,
  alter column current_members set default 1,
  alter column current_members set not null,
  alter column status set default 'pending';

alter table public.study_groups
  drop constraint if exists study_groups_status_check,
  drop constraint if exists study_groups_category_check,
  drop constraint if exists study_groups_institution_type_check,
  drop constraint if exists study_groups_level_check,
  drop constraint if exists study_groups_audience_check,
  drop constraint if exists study_groups_member_count_check,
  drop constraint if exists study_groups_estimated_cost_check;

update public.study_groups
set status = case
  when status in ('approved', 'full', 'closed', 'rejected', 'pending') then status
  else 'pending'
end;

alter table public.study_groups
  add constraint study_groups_status_check
    check (status in ('pending', 'approved', 'rejected', 'closed', 'full')),
  add constraint study_groups_category_check
    check (category in ('study_exam', 'project_research', 'competition', 'club', 'tour', 'event', 'business', 'other')),
  add constraint study_groups_institution_type_check
    check (institution_type in ('school', 'college', 'university', 'coaching', 'other')),
  add constraint study_groups_level_check
    check (level is null or level in ('class_6_8', 'ssc', 'hsc', 'admission', 'undergraduate', 'postgraduate', 'other')),
  add constraint study_groups_audience_check
    check (audience in ('all', 'institution', 'level')),
  add constraint study_groups_member_count_check
    check (max_members between 2 and 500 and current_members between 1 and max_members),
  add constraint study_groups_estimated_cost_check
    check (estimated_cost is null or estimated_cost >= 0);

create index if not exists study_groups_browse_idx
  on public.study_groups (status, category, institution_type, level, district, created_at desc);
create index if not exists study_groups_owner_idx
  on public.study_groups (user_id, created_at desc);

create table if not exists public.sohojatri_requests (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  guardian_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sohojatri_request_message_length check (char_length(message) <= 1000),
  constraint sohojatri_request_unique_user unique (post_id, user_id)
);

create table if not exists public.sohojatri_members (
  post_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  joined_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.sohojatri_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.study_groups(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('fake', 'spam', 'unsafe', 'inappropriate', 'other')),
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint sohojatri_report_unique_user unique (post_id, reporter_id),
  constraint sohojatri_report_details_length check (char_length(details) <= 1000)
);

create table if not exists public.sohojatri_messages (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.study_groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint sohojatri_message_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create table if not exists public.sohojatri_user_warnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.study_groups(id) on delete set null,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint sohojatri_warning_message_length check (char_length(btrim(message)) between 1 and 1000)
);

create index if not exists sohojatri_requests_user_idx
  on public.sohojatri_requests (user_id, created_at desc);
create index if not exists sohojatri_requests_post_idx
  on public.sohojatri_requests (post_id, status, created_at);
create index if not exists sohojatri_members_user_idx
  on public.sohojatri_members (user_id, joined_at desc);
create index if not exists sohojatri_reports_status_idx
  on public.sohojatri_reports (status, created_at desc);
create index if not exists sohojatri_messages_conversation_idx
  on public.sohojatri_messages (post_id, created_at);

alter table public.study_groups enable row level security;
alter table public.sohojatri_requests enable row level security;
alter table public.sohojatri_members enable row level security;
alter table public.sohojatri_reports enable row level security;
alter table public.sohojatri_messages enable row level security;
alter table public.sohojatri_user_warnings enable row level security;
