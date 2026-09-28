-- Run this script in the Supabase SQL Editor.
-- The trigger creates a profile inside the auth.users insert transaction,
-- so it does not depend on a client session or profiles RLS policy.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email, role, subjects, district, short_bio, status)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    new.email,
    case
      when new.raw_user_meta_data ->> 'role' in ('student', 'tutor')
        then new.raw_user_meta_data ->> 'role'
      else 'student'
    end,
    coalesce(array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'subjects', '[]'::jsonb))), '{}'),
    nullif(new.raw_user_meta_data ->> 'district', ''),
    nullif(new.raw_user_meta_data ->> 'short_bio', ''),
    'pending'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
