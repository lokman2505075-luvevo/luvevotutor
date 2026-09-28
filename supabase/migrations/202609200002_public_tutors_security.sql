-- Reinforce the public tutor read model and approval boundary.
-- Run after 202609200001_public_tutors.sql.

create or replace view public.public_tutors
with (security_invoker = false)
as
select
  id,
  full_name,
  photo_url,
  subjects,
  district,
  short_bio,
  created_at,
  rating,
  review_count
from public.profiles
where role = 'tutor'
  and status = 'approved';

revoke all on public.profiles from anon;
revoke all on public.public_tutors from public;
grant select on public.public_tutors to anon, authenticated;

create or replace function public.prevent_owner_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception 'Only admins can change tutor approval status';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_owner_status_change on public.profiles;
create trigger profiles_prevent_owner_status_change
before update on public.profiles
for each row
execute function public.prevent_owner_status_change();
