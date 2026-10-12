-- Helper reports, review lifecycle, and administrator monitoring.

create or replace function public.assignment_helper_report(
  target_helper_id uuid,
  report_reason text,
  report_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  helper_user_id uuid;
  report_id uuid;
  report_count integer;
begin
  if auth.uid() is null then
    raise exception 'হেল্পার রিপোর্ট করতে লগইন করুন';
  end if;
  if report_reason not in ('fake', 'spam', 'scam', 'inappropriate', 'other')
     or char_length(btrim(coalesce(report_details, ''))) > 1000
     or not public.sohojatri_text_is_safe(report_details) then
    raise exception 'রিপোর্টের কারণ বা বিবরণ সঠিক নয়';
  end if;
  select user_id into helper_user_id
  from public.assignment_helpers
  where id = target_helper_id and status = 'approved'
  for update;
  if not found then
    raise exception 'হেল্পার প্রোফাইল পাওয়া যায়নি';
  end if;
  if helper_user_id = auth.uid() then
    raise exception 'নিজের প্রোফাইল রিপোর্ট করা যাবে না';
  end if;
  insert into public.assignment_helper_reports (helper_id, reporter_id, reason, details)
  values (target_helper_id, auth.uid(), report_reason, btrim(coalesce(report_details, '')))
  returning id into report_id;

  select count(*)::integer into report_count
  from public.assignment_helper_reports
  where helper_id = target_helper_id;
  if report_count >= 3 then
    update public.assignment_helpers
    set status = 'suspended',
        admin_note = '৩টি রিপোর্ট পাওয়ায় স্বয়ংক্রিয়ভাবে অ্যাডমিন পর্যালোচনায় পাঠানো হয়েছে',
        updated_at = now()
    where id = target_helper_id;
  end if;
  return report_id;
end;
$$;

create or replace function public.assignment_helper_submit_review(
  target_helper_request_id uuid,
  review_rating smallint,
  review_comment text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.assignment_helper_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'হেল্পার রিভিউ দিতে লগইন করুন';
  end if;
  if review_rating is null or review_rating not between 1 and 5
     or char_length(btrim(coalesce(review_comment, ''))) > 1000
     or not public.sohojatri_text_is_safe(review_comment) then
    raise exception 'রেটিং বা রিভিউ সঠিক নয়';
  end if;
  select * into request_row
  from public.assignment_helper_requests
  where id = target_helper_request_id
  for update;
  if not found
     or request_row.requester_id is distinct from auth.uid()
     or request_row.status <> 'completed' then
    raise exception 'শুধু সম্পন্ন অনুরোধের requester রিভিউ দিতে পারবেন';
  end if;
  insert into public.assignment_helper_reviews (
    helper_request_id, reviewer_id, helper_id, rating, comment
  ) values (
    request_row.id, auth.uid(), request_row.helper_id,
    review_rating, btrim(coalesce(review_comment, ''))
  );
end;
$$;

create or replace function public.assignment_helper_review_for_request(target_helper_request_id uuid)
returns table (rating smallint, comment text)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.assignment_helper_requests
    where id = target_helper_request_id
      and requester_id = auth.uid()
      and status = 'completed'
  ) then
    raise exception 'শুধু সম্পন্ন অনুরোধের requester রিভিউ দেখতে পারবেন';
  end if;
  return query
  select review.rating, review.comment
  from public.assignment_helper_reviews as review
  where review.helper_request_id = target_helper_request_id
    and review.reviewer_id = auth.uid();
end;
$$;

create or replace function public.assignment_helper_admin_resolve_report(
  target_report_id uuid,
  decision text,
  resolution text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু অ্যাডমিন হেল্পার রিপোর্ট পরিচালনা করতে পারবেন';
  end if;
  if decision not in ('reviewed', 'dismissed')
     or char_length(btrim(coalesce(resolution, ''))) > 1000 then
    raise exception 'রিপোর্টের সিদ্ধান্ত সঠিক নয়';
  end if;
  update public.assignment_helper_reports
  set status = decision,
      resolution_note = nullif(btrim(resolution), ''),
      resolved_at = now()
  where id = target_report_id;
  if not found then
    raise exception 'রিপোর্টটি পাওয়া যায়নি';
  end if;
end;
$$;

drop view if exists public.assignment_helper_admin_requests;
create view public.assignment_helper_admin_requests
with (security_invoker = false)
as
select
  helper_request.id,
  helper_request.status,
  helper_request.created_at,
  helper_request.message,
  assignment_request.subject,
  assignment_request.deadline,
  assignment_request.details,
  helper.id as helper_id,
  helper.user_id as helper_user_id,
  case when public.sohojatri_text_is_safe(helper_profile.full_name)
    then coalesce(helper_profile.full_name, 'হেল্পার') else 'হেল্পার' end as helper_name,
  case when public.sohojatri_text_is_safe(requester_profile.full_name)
    then coalesce(requester_profile.full_name, 'ব্যবহারকারী') else 'ব্যবহারকারী' end as requester_name
from public.assignment_helper_requests as helper_request
join public.assignment_helpers as helper on helper.id = helper_request.helper_id
join public.profiles as helper_profile on helper_profile.id = helper.user_id
join public.profiles as requester_profile on requester_profile.id = helper_request.requester_id
join public.assignment_requests as assignment_request on assignment_request.id = helper_request.request_id
where public.is_admin();

drop view if exists public.assignment_helper_admin_reports;
create view public.assignment_helper_admin_reports
with (security_invoker = false)
as
select
  report.id,
  report.helper_id,
  report.reporter_id,
  report.reason,
  report.details,
  report.status,
  report.resolution_note,
  report.created_at,
  helper.user_id as helper_user_id,
  case when public.sohojatri_text_is_safe(helper_profile.full_name)
    then coalesce(helper_profile.full_name, 'হেল্পার') else 'হেল্পার' end as helper_name
from public.assignment_helper_reports as report
join public.assignment_helpers as helper on helper.id = report.helper_id
join public.profiles as helper_profile on helper_profile.id = helper.user_id
where public.is_admin();

revoke all on public.assignment_helper_admin_requests, public.assignment_helper_admin_reports from public, anon;
grant select on public.assignment_helper_admin_requests, public.assignment_helper_admin_reports to authenticated;

revoke all on function public.assignment_helper_report(uuid, text, text) from public, anon;
revoke all on function public.assignment_helper_submit_review(uuid, smallint, text) from public, anon;
revoke all on function public.assignment_helper_review_for_request(uuid) from public, anon;
revoke all on function public.assignment_helper_admin_resolve_report(uuid, text, text) from public, anon;
grant execute on function public.assignment_helper_report(uuid, text, text),
  public.assignment_helper_submit_review(uuid, smallint, text),
  public.assignment_helper_review_for_request(uuid),
  public.assignment_helper_admin_resolve_report(uuid, text, text)
to authenticated;
