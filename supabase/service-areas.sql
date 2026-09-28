-- Optional fallback table for managing active tutoring districts.
create table if not exists public.service_areas (
  district_slug text primary key,
  is_active boolean not null default true
);

alter table public.service_areas enable row level security;

create policy "Anyone can read service areas"
  on public.service_areas for select
  using (true);