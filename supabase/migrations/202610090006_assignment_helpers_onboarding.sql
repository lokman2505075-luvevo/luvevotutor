-- Helper registration and administrator moderation.

create or replace function public.assignment_helper_save(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  helper_id uuid;
  helper_skills text[];
  helper_work_types text[];
  min_rate numeric;
  max_rate numeric;
  helper_url text := nullif(btrim(coalesce(payload->>'portfolio_url', '')), '');
  helper_bio text := btrim(coalesce(payload->>'bio', ''));
  helper_experience text := btrim(coalesce(payload->>'experience', ''));
  helper_availability text := btrim(coalesce(payload->>'availability', ''));
  helper_institution text := btrim(coalesce(payload->>'institution_name', ''));
  institution_kind text := payload->>'institution_type';
  education_level text := payload->>'level';
begin
  if current_user_id is null then
    raise exception 'হেল্পার হিসেবে যুক্ত হতে লগইন করুন';
  end if;
  select coalesce(array_agg(value), '{}') into helper_skills
  from jsonb_array_elements_text(coalesce(payload->'skills', '[]'::jsonb)) as item(value);
  select coalesce(array_agg(value), '{}') into helper_work_types
  from jsonb_array_elements_text(coalesce(payload->'work_types', '[]'::jsonb)) as item(value);

  if institution_kind is null or institution_kind not in ('school', 'college', 'university', 'coaching', 'other')
     or education_level is null or education_level not in ('class_6_8', 'ssc', 'hsc', 'admission', 'undergraduate', 'postgraduate', 'other')
     or cardinality(helper_skills) not between 1 and 20
     or cardinality(helper_work_types) not between 1 and 9
     or helper_institution = '' then
    raise exception 'প্রতিষ্ঠান, স্তর, অন্তত একটি বিষয় ও কাজের ধরন নির্বাচন করুন';
  end if;
  if char_length(helper_institution) not between 1 and 160
     or char_length(helper_experience) > 1000
     or char_length(helper_bio) not between 1 and 2000
     or char_length(helper_availability) > 500
     or char_length(coalesce(helper_url, '')) > 500 then
    raise exception 'ফর্মের লেখা নির্ধারিত সীমার মধ্যে রাখুন';
  end if;
  if exists (
    select 1 from unnest(helper_skills || helper_work_types) as item(value)
    where not public.sohojatri_text_is_safe(value) or char_length(value) > 120
  ) or not public.sohojatri_text_is_safe(concat_ws(' ', helper_institution, helper_experience, helper_bio, helper_availability, helper_url)) then
    raise exception 'যোগাযোগের তথ্য বা নিষিদ্ধ বিষয়বস্তু দেওয়া যাবে না';
  end if;
  if public.sohojatri_needs_guardian(current_user_id)
     and not coalesce((payload->>'guardian_confirmed')::boolean, false) then
    raise exception 'হেল্পার আবেদন জমা দিতে অভিভাবকের নিশ্চিতকরণ প্রয়োজন';
  end if;
  if exists (
    select 1 from unnest(helper_work_types) as item(value)
    where value not in ('assignment_guidance', 'project', 'presentation', 'research', 'coding', 'design', 'translation', 'proofreading', 'other')
  ) then
    raise exception 'কাজের ধরন সঠিক নয়';
  end if;
  if helper_url is not null and helper_url !~* '^https?://' then
    raise exception 'পোর্টফোলিও লিংক http:// অথবা https:// দিয়ে শুরু করুন';
  end if;
  if coalesce(payload->>'rate_min', '') <> '' then
    if payload->>'rate_min' !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$' then
      raise exception 'সর্বনিম্ন রেট সঠিক নয়';
    end if;
    min_rate := (payload->>'rate_min')::numeric;
  end if;
  if coalesce(payload->>'rate_max', '') <> '' then
    if payload->>'rate_max' !~ '^[0-9]{1,8}(\.[0-9]{1,2})?$' then
      raise exception 'সর্বোচ্চ রেট সঠিক নয়';
    end if;
    max_rate := (payload->>'rate_max')::numeric;
  end if;
  if min_rate is not null and max_rate is not null and max_rate < min_rate then
    raise exception 'সর্বোচ্চ রেট সর্বনিম্ন রেটের কম হতে পারবে না';
  end if;
  insert into public.assignment_helpers (
    user_id, institution_type, institution_name, level, skills, work_types,
    experience, bio, rate_min, rate_max, rate_negotiable, availability,
    portfolio_url, guardian_confirmed, status, admin_note, updated_at
  ) values (
    current_user_id, institution_kind, helper_institution, education_level,
    helper_skills, helper_work_types, helper_experience, helper_bio,
    min_rate, max_rate, coalesce((payload->>'rate_negotiable')::boolean, false),
    helper_availability, helper_url, coalesce((payload->>'guardian_confirmed')::boolean, false),
    'pending', null, now()
  )
  on conflict (user_id) do update set
    institution_type = excluded.institution_type,
    institution_name = excluded.institution_name,
    level = excluded.level,
    skills = excluded.skills,
    work_types = excluded.work_types,
    experience = excluded.experience,
    bio = excluded.bio,
    rate_min = excluded.rate_min,
    rate_max = excluded.rate_max,
    rate_negotiable = excluded.rate_negotiable,
    availability = excluded.availability,
    portfolio_url = excluded.portfolio_url,
    guardian_confirmed = excluded.guardian_confirmed,
    status = 'pending',
    admin_note = null,
    updated_at = now()
  returning id into helper_id;
  return helper_id;
end;
$$;

create or replace function public.assignment_helper_admin_update(
  target_helper_id uuid,
  payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_institution text := btrim(coalesce(payload->>'institution_name', ''));
  new_bio text := btrim(coalesce(payload->>'bio', ''));
  new_experience text := btrim(coalesce(payload->>'experience', ''));
  new_availability text := btrim(coalesce(payload->>'availability', ''));
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু অ্যাডমিন হেল্পার প্রোফাইল সম্পাদনা করতে পারবেন';
  end if;
  if char_length(new_institution) not between 1 and 160
     or char_length(new_bio) not between 1 and 2000
     or char_length(new_experience) > 1000
     or char_length(new_availability) > 500
     or not public.sohojatri_text_is_safe(concat_ws(' ', new_institution, new_bio, new_experience, new_availability)) then
    raise exception 'প্রোফাইলের তথ্য সঠিক নয় বা যোগাযোগের তথ্য রয়েছে';
  end if;
  update public.assignment_helpers
  set institution_name = new_institution,
      bio = new_bio,
      experience = new_experience,
      availability = new_availability,
      status = case when status = 'approved' then 'pending' else status end,
      admin_note = null,
      updated_at = now()
  where id = target_helper_id;
  if not found then
    raise exception 'হেল্পার প্রোফাইল পাওয়া যায়নি';
  end if;
end;
$$;

create or replace function public.assignment_helper_set_paused(is_paused boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'হেল্পার প্রোফাইল পরিচালনা করতে লগইন করুন';
  end if;
  update public.assignment_helpers
  set status = case when is_paused then 'paused' else 'approved' end,
      updated_at = now()
  where user_id = auth.uid()
    and status in ('approved', 'paused');
  if not found then
    raise exception 'অনুমোদিত হেল্পার প্রোফাইল পাওয়া যায়নি';
  end if;
end;
$$;

create or replace function public.assignment_helper_admin_manage(
  target_helper_id uuid,
  action text,
  reason text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু অ্যাডমিন হেল্পার পরিচালনা করতে পারবেন';
  end if;
  if action not in ('approve', 'reject', 'suspend', 'unsuspend', 'delete')
     or char_length(btrim(coalesce(reason, ''))) > 1000
     or (action = 'reject' and nullif(btrim(coalesce(reason, '')), '') is null) then
    raise exception 'অ্যাকশন বা কারণ সঠিক নয়';
  end if;
  perform 1 from public.assignment_helpers where id = target_helper_id for update;
  if not found then
    raise exception 'হেল্পার প্রোফাইল পাওয়া যায়নি';
  end if;
  if action = 'delete' then
    delete from public.assignment_helpers where id = target_helper_id;
    return;
  end if;
  update public.assignment_helpers
  set status = case action
        when 'approve' then 'approved'
        when 'reject' then 'rejected'
        when 'suspend' then 'suspended'
        when 'unsuspend' then 'approved'
      end,
      admin_note = case when action in ('reject', 'suspend') then nullif(btrim(reason), '') else null end,
      updated_at = now()
  where id = target_helper_id;
end;
$$;

drop view if exists public.assignment_helper_admin_directory;
create view public.assignment_helper_admin_directory
with (security_invoker = false)
as
select
  helper.id,
  helper.user_id,
  case when public.sohojatri_text_is_safe(profile.full_name)
    then coalesce(profile.full_name, 'ব্যবহারকারী') else 'ব্যবহারকারী' end as full_name,
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
  helper.status,
  helper.admin_note,
  helper.created_at,
  helper.updated_at
from public.assignment_helpers as helper
join public.profiles as profile on profile.id = helper.user_id
where public.is_admin();

revoke all on public.assignment_helper_admin_directory from public, anon;
grant select on public.assignment_helper_admin_directory to authenticated;

revoke all on function public.assignment_helper_save(jsonb) from public, anon;
revoke all on function public.assignment_helper_set_paused(boolean) from public, anon;
revoke all on function public.assignment_helper_admin_manage(uuid, text, text) from public, anon;
revoke all on function public.assignment_helper_admin_update(uuid, jsonb) from public, anon;
grant execute on function public.assignment_helper_save(jsonb),
  public.assignment_helper_set_paused(boolean),
  public.assignment_helper_admin_manage(uuid, text, text),
  public.assignment_helper_admin_update(uuid, jsonb)
to authenticated;
