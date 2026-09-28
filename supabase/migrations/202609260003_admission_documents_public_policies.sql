update storage.buckets
set public = true
where id = 'admission-documents';

drop policy if exists admission_documents_public_upload on storage.objects;
create policy admission_documents_public_upload
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'admission-documents');

drop policy if exists admission_documents_admin_read on storage.objects;
drop policy if exists admission_documents_public_read on storage.objects;
create policy admission_documents_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'admission-documents');

drop policy if exists admission_documents_admin_update on storage.objects;
create policy admission_documents_admin_update
  on storage.objects for update
  to authenticated
  using (bucket_id = 'admission-documents' and public.is_admin())
  with check (bucket_id = 'admission-documents' and public.is_admin());

drop policy if exists admission_documents_admin_delete on storage.objects;
create policy admission_documents_admin_delete
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'admission-documents' and public.is_admin());