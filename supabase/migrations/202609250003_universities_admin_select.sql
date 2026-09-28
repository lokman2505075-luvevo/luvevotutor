-- Admins must be able to manage inactive university records too.
drop policy if exists universities_admin_select on public.universities;
create policy universities_admin_select
  on public.universities for select
  to authenticated
  using (public.is_admin());