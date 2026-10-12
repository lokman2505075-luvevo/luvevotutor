-- Marketplace phase 2: seller order and payout summaries.
-- Apply after 202610070001_educational_marketplace_listings.sql.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  seller_id uuid references public.profiles(id) on delete set null,
  quantity integer not null,
  amount numeric(10, 2) not null,
  commission_percent numeric(5, 2) not null,
  commission_amount numeric(10, 2) not null,
  seller_earning numeric(10, 2) not null,
  payment_method text not null,
  payment_status text not null default 'pending',
  order_status text not null default 'pending',
  delivery_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_orders_quantity_check check (quantity > 0),
  constraint marketplace_orders_amount_check check (amount > 0),
  constraint marketplace_orders_commission_percent_check check (commission_percent between 0 and 100),
  constraint marketplace_orders_commission_amount_check check (commission_amount >= 0),
  constraint marketplace_orders_seller_earning_check check (seller_earning >= 0),
  constraint marketplace_orders_payment_method_check check (payment_method in ('bkash', 'nagad', 'cod')),
  constraint marketplace_orders_payment_status_check check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  constraint marketplace_orders_status_check check (order_status in ('pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'))
);

create index if not exists marketplace_orders_seller_created_idx
  on public.orders (seller_id, created_at desc);
create index if not exists marketplace_orders_buyer_created_idx
  on public.orders (buyer_id, created_at desc);

create table if not exists public.seller_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10, 2) not null,
  status text not null default 'pending',
  payout_method text,
  admin_note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint marketplace_seller_payout_amount_check check (amount > 0),
  constraint marketplace_seller_payout_status_check check (status in ('pending', 'paid', 'rejected'))
);

create index if not exists marketplace_seller_payouts_seller_created_idx
  on public.seller_payouts (seller_id, created_at desc);

alter table public.orders enable row level security;
alter table public.seller_payouts enable row level security;

drop policy if exists marketplace_orders_buyer_select on public.orders;
drop policy if exists marketplace_orders_seller_select on public.orders;
drop policy if exists marketplace_orders_admin_all on public.orders;
create policy marketplace_orders_buyer_select
  on public.orders for select to authenticated
  using (buyer_id = auth.uid());
create policy marketplace_orders_seller_select
  on public.orders for select to authenticated
  using (seller_id = auth.uid());
create policy marketplace_orders_admin_all
  on public.orders for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists marketplace_payouts_seller_select on public.seller_payouts;
drop policy if exists marketplace_payouts_admin_all on public.seller_payouts;
create policy marketplace_payouts_seller_select
  on public.seller_payouts for select to authenticated
  using (seller_id = auth.uid());
create policy marketplace_payouts_admin_all
  on public.seller_payouts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.orders, public.seller_payouts from anon, authenticated;
grant select on public.orders, public.seller_payouts to authenticated;

create or replace view public.marketplace_seller_orders
with (security_invoker = true)
as
select
  orders.id,
  orders.seller_id,
  orders.product_id,
  products.title as product_title,
  products.type as product_type,
  orders.quantity,
  orders.amount,
  orders.commission_percent,
  orders.commission_amount,
  orders.seller_earning,
  orders.payment_method,
  orders.payment_status,
  orders.order_status,
  orders.created_at,
  case
    when buyer.role = 'student' then 'শিক্ষার্থী ক্রেতা'
    else coalesce(buyer.full_name, 'ক্রেতা')
  end as buyer_label,
  case
    when products.type = 'physical'
      and orders.order_status in ('confirmed', 'shipped', 'delivered', 'completed')
      and buyer.role <> 'student'
      then buyer.phone
    else null
  end as buyer_phone,
  case
    when products.type = 'physical'
      and orders.order_status in ('confirmed', 'shipped', 'delivered', 'completed')
      and buyer.role <> 'student'
      then orders.delivery_address
    else null
  end as delivery_address
from public.orders
join public.products on products.id = orders.product_id
join public.profiles as buyer on buyer.id = orders.buyer_id;

revoke all on public.marketplace_seller_orders from public, anon;
grant select on public.marketplace_seller_orders to authenticated;

create or replace function public.marketplace_seller_update_delivery(order_id uuid, next_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
begin
  select * into order_row
  from public.orders
  where id = order_id
  for update;

  if not found or order_row.seller_id is distinct from auth.uid() then
    raise exception 'Order not found';
  end if;

  if not exists (
    select 1 from public.products
    where id = order_row.product_id
      and type = 'physical'
  ) then
    raise exception 'Only physical orders can be updated by sellers';
  end if;

  if not (
    (order_row.order_status = 'confirmed' and next_status = 'shipped')
    or (order_row.order_status = 'shipped' and next_status = 'delivered')
  ) then
    raise exception 'Invalid seller order status transition';
  end if;

  update public.orders
  set order_status = next_status,
      updated_at = now()
  where id = order_row.id;
end;
$$;

revoke all on function public.marketplace_seller_update_delivery(uuid, text) from public, anon;
grant execute on function public.marketplace_seller_update_delivery(uuid, text) to authenticated;

drop policy if exists products_seller_delete on public.products;
create policy products_seller_delete
  on public.products for delete to authenticated
  using (
    seller_id = auth.uid()
    and not exists (
      select 1 from public.orders
      where orders.product_id = products.id
    )
  );

create or replace function public.enforce_marketplace_product_rules()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  is_admin boolean := public.is_admin();
  listing_changed boolean;
begin
  if tg_op = 'UPDATE' then
    if not is_admin then
      if new.seller_id is distinct from old.seller_id
         or new.seller_type is distinct from old.seller_type then
        raise exception 'Only admins can change marketplace ownership or moderation notes';
      end if;

      listing_changed :=
        new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.category is distinct from old.category
        or new.level is distinct from old.level
        or new.price is distinct from old.price
        or new.condition is distinct from old.condition
        or new.stock is distinct from old.stock
        or new.pickup_location is distinct from old.pickup_location
        or new.delivery_available is distinct from old.delivery_available;

      if old.status in ('approved', 'rejected') and listing_changed then
        new.status := 'pending';
      end if;

      if new.rejection_reason is distinct from old.rejection_reason then
        if new.status = 'pending' then
          new.rejection_reason := null;
        else
          raise exception 'Only admins can change marketplace moderation notes';
        end if;
      end if;

      if new.status is distinct from old.status
         and not (
           (new.status = 'pending' and old.status in ('pending', 'approved', 'rejected'))
           or (new.status = 'sold' and old.status = 'approved' and new.stock = 0)
         ) then
        raise exception 'Invalid seller listing status transition';
      end if;
    elsif new.status = 'approved'
       and new.type = 'digital'
       and not exists (select 1 from public.product_files where product_id = new.id) then
      raise exception 'Digital products require an uploaded file before approval';
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists product_images_seller_delete on public.product_images;
create policy product_images_seller_delete
  on public.product_images for delete to authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.seller_id = auth.uid()
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
    )
  );
