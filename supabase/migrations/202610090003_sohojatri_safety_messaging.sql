-- Sohojatri safety reports and accepted-member in-platform conversations.

create or replace function public.sohojatri_report_post(target_post_id uuid, report_reason text, report_details text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  post_row public.study_groups%rowtype;
  report_id uuid;
  report_count integer;
begin
  if auth.uid() is null then
    raise exception 'পোস্ট রিপোর্ট করতে লগইন করুন';
  end if;
  if report_reason not in ('fake', 'spam', 'unsafe', 'inappropriate', 'other')
     or char_length(btrim(coalesce(report_details, ''))) > 1000 then
    raise exception 'রিপোর্টের কারণ সঠিক নয়';
  end if;
  select * into post_row
  from public.study_groups
  where id = target_post_id
    and status in ('approved', 'full')
  for update;
  if not found then
    raise exception 'পোস্টটি পাওয়া যায়নি';
  end if;
  if post_row.user_id = auth.uid() then
    raise exception 'নিজের পোস্ট রিপোর্ট করা যাবে না';
  end if;
  insert into public.sohojatri_reports (post_id, reporter_id, reason, details)
  values (target_post_id, auth.uid(), report_reason, btrim(coalesce(report_details, '')))
  returning id into report_id;

  select count(*)::integer into report_count
  from public.sohojatri_reports
  where post_id = target_post_id;
  if report_count >= 3 then
    update public.study_groups
    set status = 'pending',
        admin_note = '৩টি রিপোর্ট পাওয়ায় স্বয়ংক্রিয়ভাবে পর্যালোচনায় পাঠানো হয়েছে',
        updated_at = now()
    where id = target_post_id;
  end if;
  return report_id;
end;
$$;

create or replace function public.sohojatri_send_message(target_post_id uuid, message_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'বার্তা পাঠাতে লগইন করুন';
  end if;
  if char_length(btrim(coalesce(message_body, ''))) not between 1 and 2000
     or not public.sohojatri_text_is_safe(message_body) then
    raise exception 'বার্তায় ফোন, ইমেইল, WhatsApp বা নিষিদ্ধ বিষয়বস্তু দেওয়া যাবে না';
  end if;
  if not public.sohojatri_is_post_member(target_post_id, auth.uid()) then
    raise exception 'শুধু দলের গৃহীত সদস্যরা বার্তা পাঠাতে পারবেন';
  end if;
  insert into public.sohojatri_messages (post_id, sender_id, body)
  values (target_post_id, auth.uid(), btrim(message_body))
  returning id into message_id;
  return message_id;
end;
$$;

create or replace function public.sohojatri_messages_for_member(target_post_id uuid)
returns table (id uuid, sender_name text, body text, created_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.sohojatri_is_post_member(target_post_id, auth.uid()) then
    raise exception 'শুধু দলের গৃহীত সদস্যরা বার্তা দেখতে পারবেন';
  end if;
  return query
  select message.id,
         case when public.sohojatri_text_is_safe(profile.full_name)
           then coalesce(profile.full_name, 'সহযাত্রী') else 'সহযাত্রী' end,
         message.body,
         message.created_at
  from public.sohojatri_messages as message
  join public.profiles as profile on profile.id = message.sender_id
  where message.post_id = target_post_id
  order by message.created_at
  limit 200;
end;
$$;

create or replace function public.sohojatri_my_activity()
returns table (
  activity_type text,
  post_id uuid,
  title text,
  category text,
  post_status text,
  request_status text,
  member_role text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'নিজের সহযাত্রী কার্যক্রম দেখতে লগইন করুন';
  end if;
  return query
  select 'created'::text, post.id, post.title, post.category, post.status, null::text, null::text
  from public.study_groups as post
  where post.user_id = auth.uid()
  union all
  select 'joined'::text, post.id, post.title, post.category, post.status, request.status, member.role
  from public.sohojatri_members as member
  join public.study_groups as post on post.id = member.post_id
  left join public.sohojatri_requests as request
    on request.post_id = member.post_id and request.user_id = member.user_id
  where member.user_id = auth.uid() and member.role = 'member'
  union all
  select 'requested'::text, post.id, post.title, post.category, post.status, request.status, null::text
  from public.sohojatri_requests as request
  join public.study_groups as post on post.id = request.post_id
  where request.user_id = auth.uid() and request.status <> 'accepted';
end;
$$;

revoke all on function public.sohojatri_report_post(uuid, text, text) from public, anon;
revoke all on function public.sohojatri_send_message(uuid, text) from public, anon;
revoke all on function public.sohojatri_messages_for_member(uuid) from public, anon;
revoke all on function public.sohojatri_my_activity() from public, anon;
grant execute on function public.sohojatri_report_post(uuid, text, text),
  public.sohojatri_send_message(uuid, text),
  public.sohojatri_messages_for_member(uuid),
  public.sohojatri_my_activity()
to authenticated;
