-- Admin moderation for Sohojatri posts, reports, and account warnings.

create or replace function public.sohojatri_admin_manage_post(
  target_post_id uuid,
  action text,
  reason text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_status text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু অ্যাডমিন পোস্ট পরিচালনা করতে পারবেন';
  end if;
  if action not in ('approve', 'reject', 'hide', 'close', 'remove') then
    raise exception 'পোস্টের সিদ্ধান্ত সঠিক নয়';
  end if;
  if action = 'reject' and char_length(btrim(coalesce(reason, ''))) = 0 then
    raise exception 'প্রত্যাখ্যানের কারণ লিখুন';
  end if;
  perform 1 from public.study_groups where id = target_post_id for update;
  if not found then
    raise exception 'পোস্টটি পাওয়া যায়নি';
  end if;
  if action = 'remove' then
    delete from public.study_groups where id = target_post_id;
    return;
  end if;

  next_status := case action
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    when 'hide' then 'pending'
    else 'closed'
  end;
  if action = 'approve' then
    update public.study_groups
    set status = case when current_members >= max_members then 'full' else next_status end,
        rejection_reason = null,
        admin_note = null,
        updated_at = now()
    where id = target_post_id;
  else
    update public.study_groups
    set status = next_status,
        rejection_reason = case when action = 'reject' then btrim(reason) else rejection_reason end,
        admin_note = case when action = 'hide' then nullif(btrim(reason), '') else admin_note end,
        updated_at = now()
    where id = target_post_id;
  end if;
end;
$$;

create or replace function public.sohojatri_admin_resolve_report(
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
    raise exception 'শুধু অ্যাডমিন রিপোর্ট পরিচালনা করতে পারবেন';
  end if;
  if decision not in ('reviewed', 'dismissed')
     or char_length(btrim(coalesce(resolution, ''))) > 1000 then
    raise exception 'রিপোর্টের সিদ্ধান্ত সঠিক নয়';
  end if;
  update public.sohojatri_reports
  set status = decision,
      resolution_note = nullif(btrim(resolution), ''),
      resolved_at = now()
  where id = target_report_id;
  if not found then
    raise exception 'রিপোর্টটি পাওয়া যায়নি';
  end if;
end;
$$;

create or replace function public.sohojatri_admin_warn_user(
  target_user_id uuid,
  target_post_id uuid,
  warning_text text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  warning_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'শুধু অ্যাডমিন সতর্কবার্তা পাঠাতে পারবেন';
  end if;
  if nullif(btrim(coalesce(warning_text, '')), '') is null
     or char_length(btrim(warning_text)) > 1000 then
    raise exception 'সতর্কবার্তা লিখুন';
  end if;
  insert into public.sohojatri_user_warnings (user_id, post_id, admin_id, message)
  values (target_user_id, target_post_id, auth.uid(), btrim(warning_text))
  returning id into warning_id;
  return warning_id;
end;
$$;

revoke all on function public.sohojatri_admin_manage_post(uuid, text, text) from public, anon;
revoke all on function public.sohojatri_admin_resolve_report(uuid, text, text) from public, anon;
revoke all on function public.sohojatri_admin_warn_user(uuid, uuid, text) from public, anon;
grant execute on function public.sohojatri_admin_manage_post(uuid, text, text),
  public.sohojatri_admin_resolve_report(uuid, text, text),
  public.sohojatri_admin_warn_user(uuid, uuid, text)
to authenticated;
