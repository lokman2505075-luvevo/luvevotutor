-- Marketplace phase 1: seller listings, moderation, and protected file storage.
-- Apply after 202609200001_public_tutors.sql and 202609200003_admin_requests.sql.
-- Student seller eligibility uses auth.users.phone_confirmed_at from Supabase phone auth.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) on delete cascade,
  seller_type text not null,
  title text not null,
  description text not null,
  category text not null,
  level text,
  type text not null,
  price numeric(10, 2) not null,
  condition text,
  stock integer not null default 1,
  pickup_location text,
  delivery_available boolean not null default false,
  status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_seller_type_check check (seller_type in ('platform', 'tutor', 'student')),
  constraint products_type_check check (type in ('physical', 'digital')),
  constraint products_price_check check (price > 0),
  constraint products_stock_check check (stock >= 0),
  constraint products_condition_check check (condition is null or condition in ('new', 'used')),
  constraint products_status_check check (status in ('pending', 'approved', 'rejected', 'sold')),
  constraint products_rejection_reason_length check (rejection_reason is null or char_length(rejection_reason) <= 500),
  constraint products_type_condition_check check (
    (type = 'physical' and condition is not null and (nullif(btrim(pickup_location), '') is not null or delivery_available))
    or (type = 'digital' and condition is null and pickup_location is null and not delivery_available)
  ),
  constraint products_platform_seller_check check (
    (seller_type = 'platform' and seller_id is null)
    or (seller_type <> 'platform' and seller_id is not null)
  ),
  constraint products_title_length check (char_length(title) between 1 and 120),
  constraint products_description_length check (char_length(description) between 1 and 4000)
);

create index if not exists products_status_created_idx
  on public.products (status, created_at desc);
create index if not exists products_seller_created_idx
  on public.products (seller_id, created_at desc);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images (product_id);

create table if not exists public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_files enable row level security;

create or replace function public.marketplace_student_phone_verified()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and phone_confirmed_at is not null
  );
$$;

revoke all on function public.marketplace_student_phone_verified() from public, anon;
grant execute on function public.marketplace_student_phone_verified() to authenticated;

create or replace function public.marketplace_can_list(seller_type text, seller_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and seller_id = auth.uid()
      and (
        (seller_type = 'tutor' and role = 'tutor' and status = 'approved')
        or (seller_type = 'student' and role = 'student' and public.marketplace_student_phone_verified())
      )
  );
$$;

revoke all on function public.marketplace_can_list(text, uuid) from public, anon;
grant execute on function public.marketplace_can_list(text, uuid) to authenticated;

create or replace function public.marketplace_product_is_public(product_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.products
    where id = product_id
      and status = 'approved'
  );
$$;

revoke all on function public.marketplace_product_is_public(uuid) from public;
grant execute on function public.marketplace_product_is_public(uuid) to anon, authenticated;

drop policy if exists products_public_select on public.products;
drop policy if exists products_seller_select on public.products;
drop policy if exists products_seller_insert on public.products;
drop policy if exists products_seller_update on public.products;
drop policy if exists products_seller_delete on public.products;
drop policy if exists products_admin_all on public.products;

create policy products_seller_select
  on public.products for select to authenticated
  using (seller_id = auth.uid() or public.is_admin());
create policy products_seller_insert
  on public.products for insert to authenticated
  with check (status = 'pending' and public.marketplace_can_list(seller_type, seller_id));
create policy products_seller_update
  on public.products for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());
create policy products_seller_delete
  on public.products for delete to authenticated
  using (seller_id = auth.uid() and status in ('pending', 'rejected'));
create policy products_admin_all
  on public.products for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists product_images_public_select on public.product_images;
drop policy if exists product_images_seller_insert on public.product_images;
drop policy if exists product_images_seller_delete on public.product_images;
drop policy if exists product_images_admin_all on public.product_images;

create policy product_images_public_select
  on public.product_images for select to anon, authenticated
  using (
    public.marketplace_product_is_public(product_images.product_id)
    or exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.seller_id = auth.uid()
    )
    or public.is_admin()
  );
create policy product_images_seller_insert
  on public.product_images for insert to authenticated
  with check (
    storage_path like (auth.uid()::text || '/' || product_id::text || '/%')
    and
    exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.seller_id = auth.uid()
        and products.status = 'pending'
    )
  );
create policy product_images_seller_delete
  on public.product_images for delete to authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.seller_id = auth.uid()
        and products.status in ('pending', 'rejected')
    )
  );
create policy product_images_admin_all
  on public.product_images for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists product_files_seller_select on public.product_files;
drop policy if exists product_files_seller_insert on public.product_files;
drop policy if exists product_files_seller_delete on public.product_files;
drop policy if exists product_files_admin_all on public.product_files;

create policy product_files_seller_select
  on public.product_files for select to authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_files.product_id
        and products.seller_id = auth.uid()
    )
    or public.is_admin()
  );
create policy product_files_seller_insert
  on public.product_files for insert to authenticated
  with check (
    storage_path like (auth.uid()::text || '/' || product_id::text || '/%.pdf')
    and
    exists (
      select 1 from public.products
      where products.id = product_files.product_id
        and products.seller_id = auth.uid()
        and products.type = 'digital'
        and products.status = 'pending'
    )
  );
create policy product_files_seller_delete
  on public.product_files for delete to authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_files.product_id
        and products.seller_id = auth.uid()
        and products.status in ('pending', 'rejected')
    )
  );
create policy product_files_admin_all
  on public.product_files for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.products, public.product_images, public.product_files from anon, authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, delete on public.product_images to authenticated;
grant select, insert, delete on public.product_files to authenticated;
grant select on public.product_images to anon;

create or replace view public.public_marketplace_products
with (security_invoker = false)
as
select
  products.id,
  products.seller_type,
  case
    when products.seller_type = 'platform' then 'Luvevo Official'
    when products.seller_type = 'student' then 'শিক্ষার্থী'
    else coalesce(profiles.full_name, 'যাচাইকৃত টিউটর')
  end as seller_label,
  products.title,
  products.description,
  products.category,
  products.level,
  products.type,
  products.price,
  products.condition,
  products.stock,
  products.delivery_available,
  products.created_at
from public.products
left join public.profiles on profiles.id = products.seller_id
where products.status = 'approved'
  and (
    products.seller_type = 'platform'
    or (products.seller_type = 'tutor' and profiles.role = 'tutor' and profiles.status = 'approved')
    or (products.seller_type = 'student' and profiles.role = 'student')
  );

revoke all on public.public_marketplace_products from public;
grant select on public.public_marketplace_products to anon, authenticated;

create or replace function public.enforce_marketplace_product_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if (new.seller_id is distinct from old.seller_id
        or new.seller_type is distinct from old.seller_type)
       and not public.is_admin() then
      raise exception 'Only admins can change marketplace seller identity';
    end if;
    if new.status is distinct from old.status and not public.is_admin() then
      raise exception 'Only admins can moderate marketplace listings';
    end if;
    if new.status = 'approved'
       and new.type = 'digital'
       and not exists (select 1 from public.product_files where product_id = new.id) then
      raise exception 'Digital products require an uploaded file before approval';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_enforce_rules on public.products;
create trigger products_enforce_rules
before update on public.products
for each row execute function public.enforce_marketplace_product_rules();

create or replace function public.prevent_marketplace_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_marketplace_role_change on public.profiles;
create trigger profiles_prevent_marketplace_role_change
before update on public.profiles
for each row execute function public.prevent_marketplace_profile_role_change();

create or replace function public.enforce_product_image_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  image_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.product_id::text, 0));
  select count(*) into image_count
  from public.product_images
  where product_id = new.product_id;
  if image_count >= 5 then
    raise exception 'A product may have at most five images';
  end if;
  return new;
end;
$$;

drop trigger if exists product_images_limit on public.product_images;
create trigger product_images_limit
before insert on public.product_images
for each row execute function public.enforce_product_image_limit();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('marketplace-images', 'marketplace-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('marketplace-digital', 'marketplace-digital', false, 15728640, array['application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists marketplace_images_seller_upload on storage.objects;
create policy marketplace_images_seller_upload
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'marketplace-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.products
      where products.id::text = (storage.foldername(name))[2]
        and products.seller_id = auth.uid()
        and products.status = 'pending'
    )
  );
drop policy if exists marketplace_images_seller_delete on storage.objects;
create policy marketplace_images_seller_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'marketplace-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.products
      where products.id::text = (storage.foldername(name))[2]
        and products.seller_id = auth.uid()
        and products.status in ('pending', 'rejected')
    )
  );
drop policy if exists marketplace_images_admin_upload on storage.objects;
create policy marketplace_images_admin_upload
  on storage.objects for insert to authenticated
  with check (bucket_id = 'marketplace-images' and public.is_admin());
drop policy if exists marketplace_images_admin_delete on storage.objects;
create policy marketplace_images_admin_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'marketplace-images' and public.is_admin());

drop policy if exists marketplace_digital_seller_upload on storage.objects;
create policy marketplace_digital_seller_upload
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'marketplace-digital'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.products
      where products.id::text = (storage.foldername(name))[2]
        and products.seller_id = auth.uid()
        and products.type = 'digital'
        and products.status = 'pending'
    )
  );
drop policy if exists marketplace_digital_admin_upload on storage.objects;
create policy marketplace_digital_admin_upload
  on storage.objects for insert to authenticated
  with check (bucket_id = 'marketplace-digital' and public.is_admin());
drop policy if exists marketplace_digital_seller_read on storage.objects;
create policy marketplace_digital_seller_read
  on storage.objects for select to authenticated
  using (
    bucket_id = 'marketplace-digital'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
drop policy if exists marketplace_digital_seller_delete on storage.objects;
create policy marketplace_digital_seller_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'marketplace-digital'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.products
      where products.id::text = (storage.foldername(name))[2]
        and products.seller_id = auth.uid()
        and products.status in ('pending', 'rejected')
    )
  );
drop policy if exists marketplace_digital_admin_delete on storage.objects;
create policy marketplace_digital_admin_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'marketplace-digital' and public.is_admin());
