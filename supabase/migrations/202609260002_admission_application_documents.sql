alter table public.admission_applications
  add column if not exists ssc_gpa text,
  add column if not exists hsc_gpa text,
  add column if not exists ssc_board text,
  add column if not exists hsc_board text,
  add column if not exists ssc_pass_year text,
  add column if not exists hsc_pass_year text,
  add column if not exists guardian_phone text,
  add column if not exists drive_link text,
  add column if not exists document_paths text[] not null default '{}',
  add column if not exists consent_given boolean not null default false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'admission-documents',
  'admission-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists admission_documents_public_upload on storage.objects;
create policy admission_documents_public_upload
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'admission-documents');

drop policy if exists admission_documents_admin_read on storage.objects;
create policy admission_documents_admin_read
  on storage.objects for select
  to authenticated
  using (bucket_id = 'admission-documents' and public.is_admin());