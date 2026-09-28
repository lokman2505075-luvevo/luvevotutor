-- Run this in the Supabase SQL Editor.
-- The trigger creates the profile while auth.users is being inserted, so it
-- does not depend on a client session being available after signUp().

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, email, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    new.email,
    case
      when new.raw_user_meta_data ->> 'role' in ('student', 'tutor')
        then new.raw_user_meta_data ->> 'role'
      else 'student'
    end
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
