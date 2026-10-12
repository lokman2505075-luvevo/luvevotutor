-- Helper matching requests and accepted-member in-platform messaging.

create or replace function public.assignment_helper_request_send(
  target_helper_id uuid,
  request_subject text,
  request_deadline date,
  request_details text,
  request_message text default '',
  guardian_ok boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles%rowtype;
  helper_row public.assignment_helpers%rowtype;
  assignment_request_id uuid;
  helper_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'হেল্পারকে অনুরোধ পাঠাতে লগইন করুন';
  end if;
  select * into profile_row from public.profiles where id = auth.uid();
  if not found or nullif(btrim(coalesce(profile_row.full_name, '')), '') is null then
    raise exception 'প্রোফাইলে নাম যোগ করুন';
  end if;
  if nullif(btrim(coalesce(profile_row.phone, '')), '') is null then
    raise exception 'অনুরোধের জন্য প্রোফাইলে ফোন নম্বর যোগ করুন; এটি কোনো পাবলিক কার্ডে দেখানো হবে না';
  end if;
  select * into helper_row
  from public.assignment_helpers
  where id = target_helper_id and status = 'approved'
  for update;
  if not found then
    raise exception 'এই হেল্পার এখন অনুরোধ নিচ্ছেন না';
  end if;
  if helper_row.user_id = auth.uid() then
    raise exception 'নিজের কাছে অনুরোধ পাঠানো যাবে না';
  end if;
  if nullif(btrim(coalesce(request_subject, '')), '') is null
     or char_length(btrim(request_subject)) > 160
     or nullif(btrim(coalesce(request_details, '')), '') is null
     or char_length(btrim(request_details)) > 5000
     or char_length(btrim(coalesce(request_message, ''))) > 1000
     or request_deadline is null
     or request_deadline < current_date then
    raise exception 'বিষয়, ভবিষ্যতের deadline ও কাজের বিবরণ লিখুন';
  end if;
  if not public.sohojatri_text_is_safe(concat_ws(' ', request_subject, request_details, request_message)) then
    raise exception 'বার্তায় ব্যক্তিগত যোগাযোগের তথ্য বা নিষিদ্ধ বিষয়বস্তু দেওয়া যাবে না';
  end if;
  if public.sohojatri_needs_guardian(auth.uid()) and not guardian_ok then
    raise exception 'অভিভাবককে জানিয়েছি নিশ্চিত করুন';
  end if;

  insert into public.assignment_requests (name, phone, subject, deadline, details)
  values (
    profile_row.full_name,
    profile_row.phone,
    btrim(request_subject),
    request_deadline,
    btrim(request_details)
  )
  returning id into assignment_request_id;
  insert into public.assignment_helper_requests (
    request_id, helper_id, requester_id, message, guardian_confirmed
  ) values (
    assignment_request_id, helper_row.id, auth.uid(), btrim(coalesce(request_message, '')), guardian_ok
  )
  returning id into helper_request_id;
  return helper_request_id;
end;
$$;

create or replace function public.assignment_helper_my_requests()
returns table (
  helper_request_id uuid,
  helper_id uuid,
  requester_id uuid,
  helper_user_id uuid,
  helper_name text,
  requester_name text,
  message text,
  status text,
  subject text,
  deadline date,
  details text,
  created_at timestamptz,
  viewer_role text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'অনুরোধ দেখতে লগইন করুন';
  end if;
  return query
  select helper_request.id,
         helper.id,
         helper_request.requester_id,
         helper.user_id,
         case when public.sohojatri_text_is_safe(helper_profile.full_name)
           then coalesce(helper_profile.full_name, 'হেল্পার') else 'হেল্পার' end,
         case when public.sohojatri_text_is_safe(requester_profile.full_name)
           then coalesce(requester_profile.full_name, 'ব্যবহারকারী') else 'ব্যবহারকারী' end,
         helper_request.message,
         helper_request.status,
         assignment_request.subject,
         assignment_request.deadline,
         assignment_request.details,
         helper_request.created_at,
         case when helper_request.requester_id = auth.uid() then 'requester' else 'helper' end
  from public.assignment_helper_requests as helper_request
  join public.assignment_helpers as helper on helper.id = helper_request.helper_id
  join public.profiles as helper_profile on helper_profile.id = helper.user_id
  join public.profiles as requester_profile on requester_profile.id = helper_request.requester_id
  join public.assignment_requests as assignment_request on assignment_request.id = helper_request.request_id
  where helper_request.requester_id = auth.uid() or helper.user_id = auth.uid()
  order by helper_request.created_at desc;
end;
$$;

create or replace function public.assignment_helper_request_decide(
  target_helper_request_id uuid,
  decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.assignment_helper_requests%rowtype;
  helper_user_id uuid;
begin
  if auth.uid() is null or decision not in ('accepted', 'rejected') then
    raise exception 'অনুরোধের সিদ্ধান্ত সঠিক নয়';
  end if;
  select * into request_row
  from public.assignment_helper_requests
  where id = target_helper_request_id
  for update;
  if not found or request_row.status <> 'pending' then
    raise exception 'অপেক্ষমাণ অনুরোধটি পাওয়া যায়নি';
  end if;
  select user_id into helper_user_id
  from public.assignment_helpers
  where id = request_row.helper_id
  for update;
  if helper_user_id is distinct from auth.uid() then
    raise exception 'শুধু নির্বাচিত হেল্পার এই অনুরোধের সিদ্ধান্ত দিতে পারবেন';
  end if;
  if decision = 'accepted' and not exists (
    select 1 from public.assignment_helpers
    where id = request_row.helper_id and status = 'approved'
  ) then
    raise exception 'হেল্পার প্রোফাইল এখন উপলব্ধ নয়';
  end if;
  update public.assignment_helper_requests
  set status = decision, updated_at = now()
  where id = request_row.id;
end;
$$;

create or replace function public.assignment_helper_request_complete(target_helper_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'অনুরোধ সম্পন্ন করতে লগইন করুন';
  end if;
  update public.assignment_helper_requests as helper_request
  set status = 'completed', updated_at = now()
  where helper_request.id = target_helper_request_id
    and helper_request.status = 'accepted'
    and (
      helper_request.requester_id = auth.uid()
      or exists (
        select 1 from public.assignment_helpers as helper
        where helper.id = helper_request.helper_id and helper.user_id = auth.uid()
      )
    );
  if not found then
    raise exception 'সম্পন্ন করার উপযুক্ত গৃহীত অনুরোধটি পাওয়া যায়নি';
  end if;
end;
$$;

create or replace function public.assignment_helper_send_message(
  target_helper_request_id uuid,
  message_body text
)
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
  if not exists (
    select 1 from public.assignment_helper_requests as helper_request
    join public.assignment_helpers as helper on helper.id = helper_request.helper_id
    where helper_request.id = target_helper_request_id
      and helper_request.status = 'accepted'
      and (helper_request.requester_id = auth.uid() or helper.user_id = auth.uid())
  ) then
    raise exception 'শুধু গৃহীত অনুরোধের requester ও helper বার্তা পাঠাতে পারবেন';
  end if;
  insert into public.assignment_helper_messages (helper_request_id, sender_id, body)
  values (target_helper_request_id, auth.uid(), btrim(message_body))
  returning id into message_id;
  return message_id;
end;
$$;

create or replace function public.assignment_helper_messages_for_request(target_helper_request_id uuid)
returns table (id uuid, sender_id uuid, sender_name text, body text, created_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.assignment_helper_requests as helper_request
    join public.assignment_helpers as helper on helper.id = helper_request.helper_id
    where helper_request.id = target_helper_request_id
      and helper_request.status = 'accepted'
      and (helper_request.requester_id = auth.uid() or helper.user_id = auth.uid())
  ) then
    raise exception 'শুধু গৃহীত অনুরোধের requester ও helper বার্তা দেখতে পারবেন';
  end if;
  return query
  select message.id,
         message.sender_id,
         case when public.sohojatri_text_is_safe(profile.full_name)
           then coalesce(profile.full_name, 'ব্যবহারকারী') else 'ব্যবহারকারী' end,
         message.body,
         message.created_at
  from public.assignment_helper_messages as message
  join public.profiles as profile on profile.id = message.sender_id
  where message.helper_request_id = target_helper_request_id
  order by message.created_at
  limit 200;
end;
$$;

revoke all on function public.assignment_helper_request_send(uuid, text, date, text, text, boolean) from public, anon;
revoke all on function public.assignment_helper_my_requests() from public, anon;
revoke all on function public.assignment_helper_request_decide(uuid, text) from public, anon;
revoke all on function public.assignment_helper_request_complete(uuid) from public, anon;
revoke all on function public.assignment_helper_send_message(uuid, text) from public, anon;
revoke all on function public.assignment_helper_messages_for_request(uuid) from public, anon;
grant execute on function public.assignment_helper_request_send(uuid, text, date, text, text, boolean),
  public.assignment_helper_my_requests(),
  public.assignment_helper_request_decide(uuid, text),
  public.assignment_helper_request_complete(uuid),
  public.assignment_helper_send_message(uuid, text),
  public.assignment_helper_messages_for_request(uuid)
to authenticated;
