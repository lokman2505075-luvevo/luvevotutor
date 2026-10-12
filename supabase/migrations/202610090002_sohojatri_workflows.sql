-- Server-enforced Sohojatri ownership, audience, moderation, and membership flows.

create or replace function public.sohojatri_needs_guardian(target_user uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    profile.birth_date is null
      or profile.birth_date > current_date
      or date_part('year', age(current_date, profile.birth_date)) < 18
      or profile.level in ('class_6_8', 'ssc', 'hsc'),
    true
  )
  from public.profiles as profile
  where profile.id = target_user;
$$;

create or replace function public.sohojatri_text_is_safe(content text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    translate(coalesce(content, ''), '০১২৩৪৫৬৭৮৯', '0123456789') !~*
      '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    and translate(coalesce(content, ''), '০১২৩৪৫৬৭৮৯', '0123456789') !~*
      '([+]?[0-9][0-9[:space:]().-]{7,}[0-9])'
    and coalesce(content, '') !~* '(whats[[:space:]-]?app|হোয়াটসঅ্যাপ|ইমেইল|email)'
    and coalesce(content, '') !~* '(জুয়া|জুয়া|গ্যাম্বল|gambling|illegal|অবৈধ|প্রাপ্তবয়স্ক|প্রাপ্তবয়স্ক|adult content|স্ক্যাম|প্রতারণা|নকল|পরীক্ষায় নকল|পরীক্ষায় নকল|cheat(ing)?)'
    and coalesce(content, '') !~* '(টাকা পাঠান|অগ্রিম টাকা|send money|advance payment)';
$$;

create or replace function public.sohojatri_is_post_member(target_post_id uuid, target_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select auth.uid() is not null
     and target_user_id = auth.uid()
     and exists (
       select 1 from public.sohojatri_members
       where post_id = target_post_id and user_id = target_user_id
     );
$$;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'study_groups'
  loop
    execute format('drop policy if exists %I on public.study_groups', policy_row.policyname);
  end loop;
end;
$$;

drop policy if exists sohojatri_requests_visible_to_participants on public.sohojatri_requests;
drop policy if exists sohojatri_members_visible_to_members on public.sohojatri_members;
drop policy if exists sohojatri_reports_visible_to_reporter_or_admin on public.sohojatri_reports;
drop policy if exists sohojatri_messages_visible_to_members on public.sohojatri_messages;
drop policy if exists sohojatri_warnings_visible_to_user_or_admin on public.sohojatri_user_warnings;

create policy sohojatri_posts_select
  on public.study_groups for select to anon, authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

create policy sohojatri_requests_visible_to_participants
  on public.sohojatri_requests for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.study_groups
      where study_groups.id = sohojatri_requests.post_id
        and study_groups.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy sohojatri_members_visible_to_members
  on public.sohojatri_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.sohojatri_is_post_member(post_id, auth.uid())
    or public.is_admin()
  );

create policy sohojatri_reports_visible_to_reporter_or_admin
  on public.sohojatri_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy sohojatri_messages_visible_to_members
  on public.sohojatri_messages for select to authenticated
  using (public.sohojatri_is_post_member(post_id, auth.uid()));

create policy sohojatri_warnings_visible_to_user_or_admin
  on public.sohojatri_user_warnings for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

revoke all on public.study_groups,
  public.sohojatri_requests,
  public.sohojatri_members,
  public.sohojatri_reports,
  public.sohojatri_messages,
  public.sohojatri_user_warnings
from anon, authenticated;

grant select on public.study_groups to authenticated;
grant select on public.sohojatri_requests,
  public.sohojatri_reports,
  public.sohojatri_messages,
  public.sohojatri_user_warnings
to authenticated;

drop view if exists public.public_sohojatri_posts;
create view public.public_sohojatri_posts
with (security_invoker = false)
as
select
  posts.id,
  coalesce(posts.user_id = auth.uid(), false) as is_owner,
  case
    when public.sohojatri_text_is_safe(profile.full_name) and profile.full_name is not null then profile.full_name
    when public.sohojatri_text_is_safe(posts.name) then coalesce(posts.name, 'সহযাত্রী')
    else 'সহযাত্রী'
  end as poster_name,
  posts.title,
  posts.description,
  posts.category,
  posts.institution_type,
  posts.institution_name,
  posts.level,
  posts.subject,
  posts.audience,
  posts.district,
  posts.is_online,
  posts.event_date,
  posts.estimated_cost,
  posts.max_members,
  posts.current_members,
  posts.requirements,
  posts.status,
  posts.created_at
from public.study_groups as posts
left join public.profiles as profile on profile.id = posts.user_id
where posts.status in ('approved', 'full')
  and public.sohojatri_text_is_safe(concat_ws(
    ' ',
    posts.title,
    posts.description,
    posts.institution_name,
    posts.subject,
    posts.requirements
  ));

revoke all on public.public_sohojatri_posts from public;
grant select on public.public_sohojatri_posts to anon, authenticated;

create or replace function public.sohojatri_save_post(payload jsonb, target_post_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  profile_row public.profiles%rowtype;
  post_id uuid;
  post_category text := payload->>'category';
  post_institution_type text := payload->>'institution_type';
  post_level text := nullif(payload->>'level', '');
  post_audience text := payload->>'audience';
  post_title text := btrim(coalesce(payload->>'title', ''));
  post_description text := btrim(coalesce(payload->>'description', ''));
  institution text := nullif(btrim(coalesce(payload->>'institution_name', '')), '');
  post_subject text := nullif(btrim(coalesce(payload->>'subject', '')), '');
  post_district text := nullif(payload->>'district', '');
  online boolean := coalesce((payload->>'is_online')::boolean, false);
  guardian_ok boolean := coalesce((payload->>'guardian_confirmed')::boolean, false);
  max_count integer := coalesce((payload->>'max_members')::integer, 5);
  cost numeric := nullif(payload->>'estimated_cost', '')::numeric;
  target_created_by uuid;
  profile_name text;
  compatibility_institution text;
begin
  if current_user_id is null then
    raise exception 'সহযাত্রী পোস্ট করতে লগইন করুন';
  end if;
  select * into profile_row from public.profiles where id = current_user_id;
  if not found or nullif(btrim(coalesce(profile_row.full_name, '')), '') is null then
    raise exception 'প্রোফাইলে নাম যোগ করুন';
  end if;
  if not public.sohojatri_text_is_safe(profile_row.full_name) then
    raise exception 'প্রোফাইলের নাম নিরাপদ নয়; ফোন বা ইমেইল সরিয়ে আপডেট করুন';
  end if;
  if post_title = '' or char_length(post_title) > 160
     or post_description = '' or char_length(post_description) > 5000 then
    raise exception 'শিরোনাম ও বিবরণ দিন (শিরোনাম সর্বোচ্চ ১৬০, বিবরণ ৫০০০ অক্ষর)';
  end if;
  if post_category not in ('study_exam', 'project_research', 'competition', 'club', 'tour', 'event', 'business', 'other')
     or post_institution_type not in ('school', 'college', 'university', 'coaching', 'other')
     or post_level not in ('class_6_8', 'ssc', 'hsc', 'admission', 'undergraduate', 'postgraduate', 'other')
     or post_audience not in ('all', 'institution', 'level') then
    raise exception 'নির্বাচিত বিভাগ বা প্রতিষ্ঠান-তথ্য সঠিক নয়';
  end if;
  if post_audience = 'institution' and institution is null then
    raise exception 'শুধু আমার প্রতিষ্ঠান বাছলে প্রতিষ্ঠানের নাম দিতে হবে';
  end if;
  if post_audience = 'institution'
     and (profile_row.institution_type is distinct from post_institution_type
       or lower(btrim(coalesce(profile_row.institution_name, ''))) <> lower(btrim(institution))) then
    raise exception 'শুধু আপনার নিজের প্রতিষ্ঠানকে বেছে নিতে পারবেন';
  end if;
  if post_audience = 'level' and post_level is null then
    raise exception 'শুধু আমার স্তর বাছলে স্তর নির্বাচন করতে হবে';
  end if;
  if post_audience = 'level' and profile_row.level is distinct from post_level then
    raise exception 'শুধু আপনার নিজের শিক্ষাস্তরকে বেছে নিতে পারবেন';
  end if;
  if max_count not between 2 and 500 or (cost is not null and cost < 0) then
    raise exception 'সদস্যসংখ্যা বা আনুমানিক খরচ সঠিক নয়';
  end if;
  if not online and post_district is null then
    raise exception 'জেলা নির্বাচন করুন অথবা অনলাইন বাছুন';
  end if;
  if not online and post_district not in (
    'dhaka', 'faridpur', 'gazipur', 'gopalganj', 'kishoreganj', 'madaripur',
    'manikganj', 'munshiganj', 'narayanganj', 'narsingdi', 'rajbari',
    'shariatpur', 'tangail', 'bandarban', 'brahmanbaria', 'chandpur',
    'chattogram', 'cumilla', 'coxsbazar', 'feni', 'khagrachhari',
    'lakshmipur', 'noakhali', 'rangamati', 'bogura', 'chapainawabganj',
    'joypurhat', 'naogaon', 'natore', 'pabna', 'rajshahi', 'sirajganj',
    'bagerhat', 'chuadanga', 'jashore', 'jhenaidah', 'khulna', 'kushtia',
    'magura', 'meherpur', 'narail', 'satkhira', 'barguna', 'barishal',
    'bhola', 'jhalokati', 'patuakhali', 'pirojpur', 'habiganj',
    'moulvibazar', 'sunamganj', 'sylhet', 'dinajpur', 'gaibandha',
    'kurigram', 'lalmonirhat', 'nilphamari', 'panchagarh', 'rangpur',
    'thakurgaon', 'jamalpur', 'mymensingh', 'netrokona', 'sherpur'
  ) then
    raise exception 'জেলা তালিকা থেকে একটি জেলা বাছুন';
  end if;
  if online then
    post_district := null;
  end if;
  if public.sohojatri_needs_guardian(current_user_id) and not guardian_ok then
    raise exception 'অভিভাবককে জানিয়েছি নিশ্চিত করুন';
  end if;
  if post_category = 'tour'
     and public.sohojatri_needs_guardian(current_user_id)
     and not guardian_ok then
    raise exception 'ভ্রমণ পোস্টের জন্য অভিভাবকের নিশ্চিতকরণ প্রয়োজন';
  end if;
  if not public.sohojatri_text_is_safe(concat_ws(' ', post_title, post_description, institution, post_subject, payload->>'requirements')) then
    raise exception 'যোগাযোগের তথ্য বা নিষিদ্ধ বিষয়বস্তু পোস্টে দেওয়া যাবে না';
  end if;
  if (payload->>'event_date') is not null and (payload->>'event_date') <> ''
     and (payload->>'event_date')::date < current_date then
    raise exception 'তারিখ আজকের আগে হতে পারবে না';
  end if;

  profile_name := profile_row.full_name;
  compatibility_institution := coalesce(institution, post_institution_type);
  if target_post_id is null then
    insert into public.study_groups (
      user_id, name, title, description, category, institution_type, institution_name,
      university, level, subject, audience, district, is_online, event_date,
      estimated_cost, max_members, current_members, members_needed, requirements,
      guardian_confirmed, status, rejection_reason, admin_note
    ) values (
      current_user_id, profile_name, post_title, post_description, post_category,
      post_institution_type, institution, compatibility_institution, post_level,
      coalesce(post_subject, ''), post_audience, post_district, online,
      nullif(payload->>'event_date', '')::date, cost, max_count, 1, max_count - 1,
      nullif(btrim(coalesce(payload->>'requirements', '')), ''),
      guardian_ok, 'pending', null, null
    ) returning id into post_id;

    insert into public.sohojatri_members (post_id, user_id, role)
    values (post_id, current_user_id, 'host');
  else
    select user_id into target_created_by
    from public.study_groups
    where id = target_post_id
    for update;
    if not found or target_created_by is distinct from current_user_id then
      raise exception 'শুধু নিজের সহযাত্রী পোস্ট সম্পাদনা করতে পারবেন';
    end if;
    update public.study_groups
    set name = profile_name,
        title = post_title,
        description = post_description,
        category = post_category,
        institution_type = post_institution_type,
        institution_name = institution,
        university = compatibility_institution,
        level = post_level,
        subject = coalesce(post_subject, ''),
        audience = post_audience,
        district = post_district,
        is_online = online,
        event_date = nullif(payload->>'event_date', '')::date,
        estimated_cost = cost,
        max_members = greatest(max_count, current_members),
        members_needed = greatest(max_count - current_members, 0),
        requirements = nullif(btrim(coalesce(payload->>'requirements', '')), ''),
        guardian_confirmed = guardian_ok,
        status = 'pending',
        rejection_reason = null,
        admin_note = null,
        updated_at = now()
    where id = target_post_id
    returning id into post_id;
  end if;
  return post_id;
end;
$$;

create or replace function public.sohojatri_manage_own_post(target_post_id uuid, action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or action not in ('close', 'delete') then
    raise exception 'অনুরোধটি সঠিক নয়';
  end if;
  if not exists (
    select 1 from public.study_groups
    where id = target_post_id and user_id = auth.uid()
  ) then
    raise exception 'পোস্টটি পাওয়া যায়নি';
  end if;
  perform 1 from public.study_groups where id = target_post_id for update;
  if action = 'delete' then
    delete from public.study_groups where id = target_post_id and user_id = auth.uid();
  else
    update public.study_groups
    set status = 'closed', updated_at = now()
    where id = target_post_id and user_id = auth.uid();
  end if;
end;
$$;

create or replace function public.sohojatri_request_to_join(
  target_post_id uuid,
  request_message text default '',
  guardian_ok boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  post_row public.study_groups%rowtype;
  request_id uuid;
  profile_row public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'সহযাত্রী হতে লগইন করুন';
  end if;
  if char_length(btrim(coalesce(request_message, ''))) > 1000
     or not public.sohojatri_text_is_safe(request_message) then
    raise exception 'বার্তাটি সঠিক নয়; ব্যক্তিগত যোগাযোগের তথ্য পাঠাবেন না';
  end if;
  select * into post_row from public.study_groups where id = target_post_id for update;
  if not found or post_row.status <> 'approved' then
    raise exception 'এই পোস্টে এখন যোগ দেওয়া যাচ্ছে না';
  end if;
  if post_row.user_id = auth.uid() then
    raise exception 'নিজের পোস্টে যোগ দেওয়ার অনুরোধ করা যাবে না';
  end if;
  if post_row.current_members >= post_row.max_members then
    raise exception 'দল পূর্ণ';
  end if;
  select * into profile_row from public.profiles where id = auth.uid();
  if not found then
    raise exception 'প্রোফাইল পাওয়া যায়নি';
  end if;
  if post_row.audience = 'institution'
     and (nullif(btrim(coalesce(profile_row.institution_name, '')), '') is null
       or lower(btrim(profile_row.institution_name)) <> lower(btrim(post_row.institution_name))
       or profile_row.institution_type is distinct from post_row.institution_type) then
    raise exception 'এই পোস্টে শুধু নির্দিষ্ট প্রতিষ্ঠানের সদস্যরা যোগ দিতে পারবেন';
  end if;
  if post_row.audience = 'level'
     and profile_row.level is distinct from post_row.level then
    raise exception 'এই পোস্টে শুধু নির্দিষ্ট শিক্ষাস্তরের সদস্যরা যোগ দিতে পারবেন';
  end if;
  if public.sohojatri_needs_guardian(auth.uid()) and not guardian_ok then
    raise exception 'অভিভাবককে জানিয়েছি নিশ্চিত করুন';
  end if;
  if post_row.category = 'tour'
     and public.sohojatri_needs_guardian(auth.uid())
     and not guardian_ok then
    raise exception 'ভ্রমণে যোগ দিতে অভিভাবকের নিশ্চিতকরণ প্রয়োজন';
  end if;

  insert into public.sohojatri_requests (post_id, user_id, message, guardian_confirmed)
  values (target_post_id, auth.uid(), btrim(coalesce(request_message, '')), guardian_ok)
  returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.sohojatri_decide_request(target_request_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.sohojatri_requests%rowtype;
  post_row public.study_groups%rowtype;
  applicant public.profiles%rowtype;
begin
  if auth.uid() is null or decision not in ('accepted', 'rejected') then
    raise exception 'অনুরোধটি সঠিক নয়';
  end if;
  select * into request_row
  from public.sohojatri_requests
  where id = target_request_id;
  if not found then
    raise exception 'যোগদানের অনুরোধটি পাওয়া যায়নি';
  end if;
  select * into post_row
  from public.study_groups
  where id = request_row.post_id
  for update;
  select * into request_row
  from public.sohojatri_requests
  where id = target_request_id
  for update;
  if not found or post_row.user_id <> auth.uid() or request_row.status <> 'pending' then
    raise exception 'এই অনুরোধের সিদ্ধান্ত দেওয়ার অনুমতি নেই';
  end if;
  if decision = 'rejected' then
    update public.sohojatri_requests
    set status = 'rejected', updated_at = now()
    where id = request_row.id;
    return;
  end if;
  if post_row.status <> 'approved' or post_row.current_members >= post_row.max_members then
    raise exception 'দল পূর্ণ বা বন্ধ';
  end if;
  select * into applicant from public.profiles where id = request_row.user_id;
  if post_row.audience = 'institution'
     and (nullif(btrim(coalesce(applicant.institution_name, '')), '') is null
       or lower(btrim(applicant.institution_name)) <> lower(btrim(post_row.institution_name))
       or applicant.institution_type is distinct from post_row.institution_type) then
    raise exception 'আবেদনকারী নির্ধারিত প্রতিষ্ঠানের নন';
  end if;
  if post_row.audience = 'level' and applicant.level is distinct from post_row.level then
    raise exception 'আবেদনকারী নির্ধারিত শিক্ষাস্তরের নন';
  end if;
  if public.sohojatri_needs_guardian(request_row.user_id) and not request_row.guardian_confirmed then
    raise exception 'অভিভাবকের নিশ্চিতকরণ নেই';
  end if;
  update public.sohojatri_requests
  set status = 'accepted', updated_at = now()
  where id = request_row.id;
  insert into public.sohojatri_members (post_id, user_id, role)
  values (post_row.id, request_row.user_id, 'member')
  on conflict (post_id, user_id) do nothing;
  if not found then
    raise exception 'ব্যবহারকারী ইতিমধ্যে এই দলের সদস্য';
  end if;
  update public.study_groups
  set current_members = current_members + 1,
      members_needed = greatest(max_members - current_members - 1, 0),
      status = case when current_members + 1 >= max_members then 'full' else 'approved' end,
      updated_at = now()
  where id = post_row.id;
end;
$$;

create or replace function public.sohojatri_members_for_post(target_post_id uuid)
returns table (full_name text, role text)
language sql
security definer
stable
set search_path = public
as $$
  select case
           when public.sohojatri_text_is_safe(profile.full_name) then coalesce(profile.full_name, 'সহযাত্রী')
           else 'সহযাত্রী'
         end,
         member.role
  from public.sohojatri_members as member
  join public.profiles as profile on profile.id = member.user_id
  join public.study_groups as post on post.id = member.post_id
  where member.post_id = target_post_id
    and post.status in ('approved', 'full')
    and public.sohojatri_text_is_safe(concat_ws(
      ' ',
      post.title,
      post.description,
      post.institution_name,
      post.subject,
      post.requirements
    ))
  order by case when member.role = 'host' then 0 else 1 end, member.joined_at;
$$;

create or replace function public.sohojatri_pending_requests(target_post_id uuid)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  message text,
  status text,
  guardian_confirmed boolean,
  created_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.study_groups
    where study_groups.id = target_post_id
      and study_groups.user_id = auth.uid()
  ) then
    raise exception 'শুধু পোস্টের আয়োজক যোগদানের অনুরোধ দেখতে পারবেন';
  end if;
  return query
  select request.id, request.user_id,
         case when public.sohojatri_text_is_safe(profile.full_name)
           then coalesce(profile.full_name, 'শিক্ষার্থী') else 'শিক্ষার্থী' end,
         request.message, request.status, request.guardian_confirmed, request.created_at
  from public.sohojatri_requests as request
  join public.profiles as profile on profile.id = request.user_id
  where request.post_id = target_post_id and request.status = 'pending'
  order by request.created_at;
end;
$$;

revoke all on function public.sohojatri_needs_guardian(uuid) from public, anon;
revoke all on function public.sohojatri_text_is_safe(text) from public, anon;
revoke all on function public.sohojatri_is_post_member(uuid, uuid) from public, anon;
revoke all on function public.sohojatri_save_post(jsonb, uuid) from public, anon;
revoke all on function public.sohojatri_manage_own_post(uuid, text) from public, anon;
revoke all on function public.sohojatri_request_to_join(uuid, text, boolean) from public, anon;
revoke all on function public.sohojatri_decide_request(uuid, text) from public, anon;
revoke all on function public.sohojatri_members_for_post(uuid) from public, anon;
revoke all on function public.sohojatri_pending_requests(uuid) from public, anon;
grant execute on function public.sohojatri_save_post(jsonb, uuid),
  public.sohojatri_manage_own_post(uuid, text),
  public.sohojatri_request_to_join(uuid, text, boolean),
  public.sohojatri_decide_request(uuid, text)
to authenticated;
grant execute on function public.sohojatri_members_for_post(uuid) to anon, authenticated;
grant execute on function public.sohojatri_pending_requests(uuid) to authenticated;
grant execute on function public.sohojatri_is_post_member(uuid, uuid) to authenticated;
