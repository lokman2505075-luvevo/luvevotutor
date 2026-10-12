-- Extend university admission records with CMS-managed detail pages.

alter table public.universities
  add column if not exists slug text,
  add column if not exists overview text,
  add column if not exists why_study jsonb not null default '[]'::jsonb,
  add column if not exists established_year integer,
  add column if not exists address text,
  add column if not exists district text,
  add column if not exists logo_url text,
  add column if not exists cover_image_url text,
  add column if not exists official_url text,
  add column if not exists admission_url text,
  add column if not exists admission_info jsonb not null default '{}'::jsonb,
  add column if not exists cost_info jsonb not null default '[]'::jsonb,
  add column if not exists scholarship_info text,
  add column if not exists others text,
  add column if not exists faqs jsonb not null default '[]'::jsonb,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_og_image_url text,
  add column if not exists details_published boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists pyq_requires_login boolean not null default true;

with slug_candidates as (
  select
    id,
    coalesce(
      nullif(trim(both '-' from regexp_replace(lower(coalesce(nullif(name_en, ''), name_bn, 'university')), '[^a-z0-9]+', '-', 'g')), ''),
      'university'
    ) as base_slug
  from public.universities
  where slug is null or btrim(slug) = ''
),
ranked_slugs as (
  select
    id,
    base_slug,
    row_number() over (partition by base_slug order by id) as duplicate_number
  from slug_candidates
)
update public.universities as university
set slug = case
  when ranked_slugs.duplicate_number = 1 then ranked_slugs.base_slug
  else ranked_slugs.base_slug || '-' || left(ranked_slugs.id::text, 8)
end
from ranked_slugs
where university.id = ranked_slugs.id;

alter table public.universities
  alter column slug set not null;

create unique index if not exists universities_slug_unique_idx
  on public.universities (slug);

create index if not exists universities_published_slug_idx
  on public.universities (slug)
  where details_published = true and is_active = true and deleted_at is null;

create table if not exists public.university_departments (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  faculty text not null,
  name text not null,
  seats integer,
  note text,
  sort_order integer not null default 0
);

create table if not exists public.university_videos (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  title text not null,
  url text not null,
  sort_order integer not null default 0
);

create table if not exists public.university_images (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  url text not null,
  caption text,
  sort_order integer not null default 0
);

create table if not exists public.university_pyqs (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  year integer not null,
  title text not null,
  unit text,
  private_file_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.facility_options (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text not null,
  sort_order integer not null default 0
);

create table if not exists public.university_facilities (
  university_id uuid not null references public.universities(id) on delete cascade,
  facility_id uuid not null references public.facility_options(id) on delete cascade,
  primary key (university_id, facility_id)
);

create table if not exists public.section_settings (
  university_id uuid not null references public.universities(id) on delete cascade,
  section_key text not null,
  visible boolean not null default true,
  sort_order integer not null default 0,
  primary key (university_id, section_key)
);

create table if not exists public.custom_sections (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  title text not null,
  type text not null check (type in ('rich_text', 'list', 'link', 'video', 'file')),
  content jsonb not null default '{}'::jsonb,
  visible boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  entity text not null,
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete')),
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists university_departments_university_order_idx
  on public.university_departments (university_id, sort_order, faculty, name);
create index if not exists university_videos_university_order_idx
  on public.university_videos (university_id, sort_order);
create index if not exists university_images_university_order_idx
  on public.university_images (university_id, sort_order);
create index if not exists university_pyqs_university_year_order_idx
  on public.university_pyqs (university_id, year desc, sort_order);
create index if not exists custom_sections_university_order_idx
  on public.custom_sections (university_id, sort_order);
create index if not exists admin_audit_log_entity_created_idx
  on public.admin_audit_log (entity, entity_id, created_at desc);

insert into public.section_settings (university_id, section_key, visible, sort_order)
select university.id, section.section_key, true, section.sort_order
from public.universities as university
cross join (values
  ('overview', 10),
  ('why_study', 20),
  ('departments', 30),
  ('admissions', 40),
  ('costs', 50),
  ('facilities', 60),
  ('videos', 70),
  ('gallery', 80),
  ('pyq', 90),
  ('others', 100),
  ('faq', 110)
) as section(section_key, sort_order)
on conflict (university_id, section_key) do nothing;

create or replace function public.university_details_seed_sections()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.section_settings (university_id, section_key, visible, sort_order)
  values
    (new.id, 'overview', true, 10),
    (new.id, 'why_study', true, 20),
    (new.id, 'departments', true, 30),
    (new.id, 'admissions', true, 40),
    (new.id, 'costs', true, 50),
    (new.id, 'facilities', true, 60),
    (new.id, 'videos', true, 70),
    (new.id, 'gallery', true, 80),
    (new.id, 'pyq', true, 90),
    (new.id, 'others', true, 100),
    (new.id, 'faq', true, 110);
  return new;
end;
$$;

drop trigger if exists universities_seed_detail_sections on public.universities;
create trigger universities_seed_detail_sections
after insert on public.universities
for each row execute function public.university_details_seed_sections();

alter table public.university_departments enable row level security;
alter table public.university_videos enable row level security;
alter table public.university_images enable row level security;
alter table public.university_pyqs enable row level security;
alter table public.facility_options enable row level security;
alter table public.university_facilities enable row level security;
alter table public.section_settings enable row level security;
alter table public.custom_sections enable row level security;
alter table public.admin_audit_log enable row level security;

drop policy if exists universities_public_select on public.universities;
create policy universities_public_select
  on public.universities for select
  to anon, authenticated
  using (is_active = true and deleted_at is null);

drop policy if exists universities_admin_select on public.universities;
create policy universities_admin_select
  on public.universities for select
  to authenticated
  using (public.is_admin());

drop policy if exists university_departments_public_select on public.university_departments;
create policy university_departments_public_select
  on public.university_departments for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.universities as university
      join public.section_settings as section
        on section.university_id = university.id
       and section.section_key = 'departments'
       and section.visible = true
      where university.id = university_departments.university_id
        and university.is_active = true
        and university.deleted_at is null
        and university.details_published = true
    )
  );

drop policy if exists university_videos_public_select on public.university_videos;
create policy university_videos_public_select
  on public.university_videos for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.universities as university
      join public.section_settings as section
        on section.university_id = university.id
       and section.section_key = 'videos'
       and section.visible = true
      where university.id = university_videos.university_id
        and university.is_active = true
        and university.deleted_at is null
        and university.details_published = true
    )
  );

drop policy if exists university_images_public_select on public.university_images;
create policy university_images_public_select
  on public.university_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.universities as university
      join public.section_settings as section
        on section.university_id = university.id
       and section.section_key = 'gallery'
       and section.visible = true
      where university.id = university_images.university_id
        and university.is_active = true
        and university.deleted_at is null
        and university.details_published = true
    )
  );

drop policy if exists university_pyqs_public_select on public.university_pyqs;
create policy university_pyqs_public_select
  on public.university_pyqs for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.universities as university
      join public.section_settings as section
        on section.university_id = university.id
       and section.section_key = 'pyq'
       and section.visible = true
      where university.id = university_pyqs.university_id
        and university.is_active = true
        and university.deleted_at is null
        and university.details_published = true
    )
  );

drop policy if exists facility_options_admin_all on public.facility_options;
create policy facility_options_admin_all
  on public.facility_options for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists facility_options_public_select on public.facility_options;
create policy facility_options_public_select
  on public.facility_options for select
  to anon, authenticated
  using (exists (select 1 from public.university_facilities where facility_id = id));

drop policy if exists university_facilities_public_select on public.university_facilities;
create policy university_facilities_public_select
  on public.university_facilities for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.universities as university
      join public.section_settings as section
        on section.university_id = university.id
       and section.section_key = 'facilities'
       and section.visible = true
      where university.id = university_facilities.university_id
        and university.is_active = true
        and university.deleted_at is null
        and university.details_published = true
    )
  );

drop policy if exists section_settings_public_select on public.section_settings;
create policy section_settings_public_select
  on public.section_settings for select
  to anon, authenticated
  using (
    visible = true
    and exists (
      select 1 from public.universities as university
      where university.id = section_settings.university_id
        and university.is_active = true
        and university.deleted_at is null
        and university.details_published = true
    )
  );

drop policy if exists custom_sections_public_select on public.custom_sections;
create policy custom_sections_public_select
  on public.custom_sections for select
  to anon, authenticated
  using (
    visible = true
    and exists (
      select 1 from public.universities as university
      where university.id = custom_sections.university_id
        and university.is_active = true
        and university.deleted_at is null
        and university.details_published = true
    )
  );

drop policy if exists admin_audit_log_admin_select on public.admin_audit_log;
create policy admin_audit_log_admin_select
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

drop policy if exists admin_audit_log_admin_insert on public.admin_audit_log;
create policy admin_audit_log_admin_insert
  on public.admin_audit_log for insert
  to authenticated
  with check (public.is_admin() and admin_id = auth.uid());

drop policy if exists admin_audit_log_admin_delete on public.admin_audit_log;
create policy admin_audit_log_admin_delete
  on public.admin_audit_log for delete
  to authenticated
  using (public.is_admin());

drop policy if exists university_departments_admin_all on public.university_departments;
create policy university_departments_admin_all
  on public.university_departments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists university_videos_admin_all on public.university_videos;
create policy university_videos_admin_all
  on public.university_videos for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists university_images_admin_all on public.university_images;
create policy university_images_admin_all
  on public.university_images for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists university_pyqs_admin_all on public.university_pyqs;
create policy university_pyqs_admin_all
  on public.university_pyqs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists university_facilities_admin_all on public.university_facilities;
create policy university_facilities_admin_all
  on public.university_facilities for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists section_settings_admin_all on public.section_settings;
create policy section_settings_admin_all
  on public.section_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists custom_sections_admin_all on public.custom_sections;
create policy custom_sections_admin_all
  on public.custom_sections for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.universities from anon, authenticated;
grant select (
  id, name_bn, name_en, category, college_code, circular_date, application_start,
  application_end, exam_date, exam_center, result, status, display_order,
  is_active, created_at, updated_at, slug, details_published, overview, why_study,
  established_year, address, district, logo_url, cover_image_url, official_url,
  admission_url, admission_info, cost_info, scholarship_info, others, faqs,
  seo_title, seo_description, seo_og_image_url
) on public.universities to anon, authenticated;
grant insert, update, delete on public.universities to authenticated;

grant select on public.university_departments, public.university_videos,
  public.university_images, public.university_facilities, public.section_settings,
  public.custom_sections, public.facility_options to anon, authenticated;
revoke all on public.university_pyqs from anon, authenticated;
grant select (id, university_id, year, title, unit, sort_order, created_at)
  on public.university_pyqs to anon, authenticated;
grant insert, update, delete on public.university_departments, public.university_videos,
  public.university_images, public.university_pyqs, public.facility_options,
  public.university_facilities, public.section_settings, public.custom_sections,
  public.admin_audit_log to authenticated;
grant select, update, delete on public.admin_audit_log to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('university-images', 'university-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('university-pyqs', 'university-pyqs', false, 20971520, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists university_images_admin_upload on storage.objects;
create policy university_images_admin_upload
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'university-images' and public.is_admin());

drop policy if exists university_images_admin_update on storage.objects;
create policy university_images_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'university-images' and public.is_admin())
  with check (bucket_id = 'university-images' and public.is_admin());

drop policy if exists university_images_admin_delete on storage.objects;
create policy university_images_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'university-images' and public.is_admin());

drop policy if exists university_pyqs_admin_upload on storage.objects;
create policy university_pyqs_admin_upload
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'university-pyqs' and public.is_admin());

drop policy if exists university_pyqs_admin_update on storage.objects;
create policy university_pyqs_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'university-pyqs' and public.is_admin())
  with check (bucket_id = 'university-pyqs' and public.is_admin());

drop policy if exists university_pyqs_admin_delete on storage.objects;
create policy university_pyqs_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'university-pyqs' and public.is_admin());
