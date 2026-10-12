-- Moderated assignment helpers and private requester-helper conversations.
-- The legacy public.helpers and assignment_requests flows remain available.

create table if not exists public.assignment_helpers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  institution_type text not null check (institution_type in ('school', 'college', 'university', 'coaching', 'other')),
  institution_name text not null,
  level text not null check (level in ('class_6_8', 'ssc', 'hsc', 'admission', 'undergraduate', 'postgraduate', 'other')),
  skills text[] not null default '{}',
  work_types text[] not null default '{}',
  experience text not null default '',
  bio text not null default '',
  rate_min numeric(10, 2),
  rate_max numeric(10, 2),
  rate_negotiable boolean not null default false,
  availability text not null default '',
  portfolio_url text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'paused', 'suspended')),
  guardian_confirmed boolean not null default false,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_helper_skills_length check (cardinality(skills) between 1 and 20),
  constraint assignment_helper_work_types_length check (cardinality(work_types) between 1 and 9),
  constraint assignment_helper_text_lengths check (
    char_length(institution_name) between 1 and 160
    and char_length(experience) <= 1000
    and char_length(bio) between 1 and 2000
    and char_length(availability) <= 500
  ),
  constraint assignment_helper_rates_valid check (
    (rate_min is null or rate_min >= 0)
    and (rate_max is null or rate_max >= 0)
    and (rate_min is null or rate_max is null or rate_max >= rate_min)
  )
);

create table if not exists public.assignment_helper_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.assignment_requests(id) on delete cascade,
  helper_id uuid not null references public.assignment_helpers(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected', 'completed')),
  guardian_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assignment_helper_request_message_length check (char_length(message) <= 1000),
  constraint assignment_helper_request_unique unique (request_id, helper_id)
);

create table if not exists public.assignment_helper_reviews (
  id uuid primary key default gen_random_uuid(),
  helper_request_id uuid not null unique references public.assignment_helper_requests(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  helper_id uuid not null references public.assignment_helpers(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  constraint assignment_helper_review_comment_length check (char_length(comment) <= 1000)
);

create table if not exists public.assignment_helper_reports (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null references public.assignment_helpers(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('fake', 'spam', 'scam', 'inappropriate', 'other')),
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint assignment_helper_report_unique unique (helper_id, reporter_id),
  constraint assignment_helper_report_details_length check (char_length(details) <= 1000)
);

create table if not exists public.assignment_helper_messages (
  id uuid primary key default gen_random_uuid(),
  helper_request_id uuid not null references public.assignment_helper_requests(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint assignment_helper_message_body_length check (char_length(btrim(body)) between 1 and 2000)
);

create index if not exists assignment_helpers_directory_idx
  on public.assignment_helpers (status, institution_type, level, created_at desc);
create index if not exists assignment_helper_requests_requester_idx
  on public.assignment_helper_requests (requester_id, created_at desc);
create index if not exists assignment_helper_requests_helper_idx
  on public.assignment_helper_requests (helper_id, status, created_at desc);
create index if not exists assignment_helper_reviews_helper_idx
  on public.assignment_helper_reviews (helper_id, created_at desc);
create index if not exists assignment_helper_reports_status_idx
  on public.assignment_helper_reports (status, created_at desc);
create index if not exists assignment_helper_messages_conversation_idx
  on public.assignment_helper_messages (helper_request_id, created_at);

alter table public.assignment_helpers enable row level security;
alter table public.assignment_helper_requests enable row level security;
alter table public.assignment_helper_reviews enable row level security;
alter table public.assignment_helper_reports enable row level security;
alter table public.assignment_helper_messages enable row level security;

drop policy if exists assignment_helpers_select_owner_or_admin on public.assignment_helpers;
create policy assignment_helpers_select_owner_or_admin
  on public.assignment_helpers for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists assignment_helper_requests_select_participants on public.assignment_helper_requests;
create policy assignment_helper_requests_select_participants
  on public.assignment_helper_requests for select to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.assignment_helpers
      where assignment_helpers.id = assignment_helper_requests.helper_id
        and assignment_helpers.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists assignment_helper_reviews_select_public_or_admin on public.assignment_helper_reviews;
create policy assignment_helper_reviews_select_public_or_admin
  on public.assignment_helper_reviews for select to anon, authenticated
  using (exists (
    select 1 from public.assignment_helpers
    where assignment_helpers.id = assignment_helper_reviews.helper_id
      and assignment_helpers.status = 'approved'
  ) or public.is_admin());

drop policy if exists assignment_helper_reports_select_reporter_or_admin on public.assignment_helper_reports;
create policy assignment_helper_reports_select_reporter_or_admin
  on public.assignment_helper_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists assignment_helper_messages_select_participants on public.assignment_helper_messages;
create policy assignment_helper_messages_select_participants
  on public.assignment_helper_messages for select to authenticated
  using (exists (
    select 1 from public.assignment_helper_requests as helper_request
    join public.assignment_helpers as helper on helper.id = helper_request.helper_id
    where helper_request.id = assignment_helper_messages.helper_request_id
      and helper_request.status = 'accepted'
      and (helper_request.requester_id = auth.uid() or helper.user_id = auth.uid())
  ) or public.is_admin());

revoke all on public.assignment_helpers, public.assignment_helper_requests,
  public.assignment_helper_reviews, public.assignment_helper_reports,
  public.assignment_helper_messages from anon, authenticated;
grant select on public.assignment_helpers, public.assignment_helper_requests,
  public.assignment_helper_reviews, public.assignment_helper_reports,
  public.assignment_helper_messages to authenticated;
grant select on public.assignment_helper_reviews to anon;

drop view if exists public.public_assignment_helpers;
create view public.public_assignment_helpers
with (security_invoker = false)
as
select
  helper.id,
  helper.user_id,
  case
    when public.sohojatri_text_is_safe(profile.full_name) and profile.full_name is not null then profile.full_name
    else 'যাচাইকৃত হেল্পার'
  end as full_name,
  profile.photo_url,
  helper.institution_type,
  helper.institution_name,
  helper.level,
  helper.skills,
  helper.work_types,
  helper.experience,
  helper.bio,
  helper.rate_min,
  helper.rate_max,
  helper.rate_negotiable,
  helper.availability,
  helper.portfolio_url,
  coalesce(review_data.average_rating, 0)::numeric(3, 2) as average_rating,
  coalesce(review_data.review_count, 0)::integer as review_count,
  helper.created_at
from public.assignment_helpers as helper
join public.profiles as profile on profile.id = helper.user_id
left join lateral (
  select round(avg(review.rating)::numeric, 2) as average_rating, count(*)::integer as review_count
  from public.assignment_helper_reviews as review
  where review.helper_id = helper.id
) as review_data on true
where helper.status = 'approved';

revoke all on public.public_assignment_helpers from public;
grant select on public.public_assignment_helpers to anon, authenticated;
