-- Marketplace phase 4: transactional checkout and manual bKash/Nagad verification.
-- Apply after 202610070003_marketplace_discovery_and_messaging.sql.

create table if not exists public.marketplace_commissions (
  seller_type text primary key,
  commission_percent numeric(5, 2) not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint marketplace_commissions_seller_type_check check (seller_type in ('platform', 'tutor', 'student')),
  constraint marketplace_commissions_percent_check check (commission_percent between 0 and 100)
);

insert into public.marketplace_commissions (seller_type, commission_percent)
values ('platform', 0), ('tutor', 10), ('student', 5)
on conflict (seller_type) do nothing;

alter table public.marketplace_commissions enable row level security;
drop policy if exists marketplace_commissions_authenticated_select on public.marketplace_commissions;
drop policy if exists marketplace_commissions_admin_update on public.marketplace_commissions;
create policy marketplace_commissions_authenticated_select
  on public.marketplace_commissions for select to authenticated
  using (true);
create policy marketplace_commissions_admin_update
  on public.marketplace_commissions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
revoke all on public.marketplace_commissions from anon, authenticated;
grant select on public.marketplace_commissions to authenticated;
grant update on public.marketplace_commissions to authenticated;

alter table public.orders
  add column if not exists payment_reference text,
  add column if not exists fulfillment_method text,
  add column if not exists pickup_location text,
  add column if not exists payment_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists payment_verified_at timestamptz;

create or replace view public.public_marketplace_products
with (security_invoker = false)
as
select
  products.id,
  products.seller_type,
  case
    when products.seller_type = 'platform' then 'Luvevo Official'
    when products.seller_type = 'student' then 'Student'
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
  products.created_at,
  case when products.seller_type = 'tutor' then profiles.photo_url else null end as seller_photo_url,
  case when products.seller_type = 'tutor' then profiles.rating else null end as seller_rating,
  case when products.seller_type = 'tutor' then profiles.review_count else null end as seller_review_count,
  coalesce(sales.popularity_count, 0) as popularity_count,
  coalesce(products.seller_id = auth.uid(), false) as is_owner,
  products.pickup_location
from public.products
left join public.profiles on profiles.id = products.seller_id
left join lateral (
  select count(*)::integer as popularity_count
  from public.orders
  where orders.product_id = products.id
    and orders.payment_status = 'paid'
    and orders.order_status <> 'cancelled'
) as sales on true
where products.status = 'approved'
  and (
    products.seller_type = 'platform'
    or (products.seller_type = 'tutor' and profiles.role = 'tutor' and profiles.status = 'approved')
    or (products.seller_type = 'student' and profiles.role = 'student')
  );

revoke all on public.public_marketplace_products from public;
grant select on public.public_marketplace_products to anon, authenticated;

alter table public.orders
  drop constraint if exists marketplace_orders_payment_status_check,
  drop constraint if exists marketplace_orders_fulfillment_method_check,
  drop constraint if exists marketplace_orders_payment_reference_length;
alter table public.orders
  add constraint marketplace_orders_payment_status_check
    check (payment_status in ('pending', 'verification_pending', 'paid', 'failed', 'refunded')),
  add constraint marketplace_orders_fulfillment_method_check
    check (fulfillment_method is null or fulfillment_method in ('pickup', 'delivery')),
  add constraint marketplace_orders_payment_reference_length
    check (payment_reference is null or char_length(payment_reference) between 6 and 80);

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
        raise exception 'Only admins can change marketplace ownership';
      end if;

      listing_changed :=
        new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.category is distinct from old.category
        or new.level is distinct from old.level
        or new.price is distinct from old.price
        or new.condition is distinct from old.condition
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

create unique index if not exists marketplace_orders_payment_reference_unique
  on public.orders (upper(payment_reference))
  where payment_reference is not null;

create or replace function public.marketplace_create_order(
  product_id uuid,
  quantity integer,
  payment_method text,
  fulfillment_method text default null,
  delivery_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  listing public.products%rowtype;
  commission numeric(5, 2);
  subtotal numeric(10, 2);
  commission_amount numeric(10, 2);
  new_order_id uuid;
  initial_order_status text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to place an order';
  end if;
  if quantity is null or quantity < 1 or quantity > 100 then
    raise exception 'Order quantity must be between 1 and 100';
  end if;
  if payment_method not in ('bkash', 'nagad', 'cod') then
    raise exception 'Unsupported payment method';
  end if;

  select * into listing
  from public.products
  where id = product_id
    and status = 'approved'
  for update;

  if not found then
    raise exception 'Product is not available';
  end if;
  if listing.seller_id = auth.uid() then
    raise exception 'You cannot buy your own product';
  end if;
  if listing.stock < quantity then
    raise exception 'Not enough stock';
  end if;
  if listing.type = 'digital' and payment_method = 'cod' then
    raise exception 'Cash on delivery is not available for digital products';
  end if;
  if listing.type = 'physical' and (fulfillment_method is null or fulfillment_method not in ('pickup', 'delivery')) then
    raise exception 'Choose pickup or delivery';
  end if;
  if listing.type = 'physical' and fulfillment_method = 'delivery'
     and char_length(btrim(coalesce(delivery_address, ''))) not between 5 and 500 then
    raise exception 'Enter a delivery address between 5 and 500 characters';
  end if;
  if listing.type = 'physical' and fulfillment_method = 'pickup'
     and nullif(btrim(listing.pickup_location), '') is null then
    raise exception 'Pickup is not available for this product';
  end if;

  select commission_percent into commission
  from public.marketplace_commissions
  where seller_type = listing.seller_type;
  if commission is null then
    raise exception 'Commission settings are missing for this seller type';
  end if;

  subtotal := round(listing.price * quantity, 2);
  commission_amount := round(subtotal * commission / 100, 2);
  initial_order_status := case
    when listing.type = 'physical' and payment_method = 'cod' then 'confirmed'
    else 'pending'
  end;

  insert into public.orders (
    buyer_id, product_id, seller_id, quantity, amount,
    commission_percent, commission_amount, seller_earning,
    payment_method, payment_status, order_status,
    fulfillment_method, delivery_address, pickup_location
  )
  values (
    auth.uid(), listing.id, listing.seller_id, quantity, subtotal,
    commission, commission_amount, subtotal - commission_amount,
    payment_method, 'pending', initial_order_status,
    case when listing.type = 'physical' then fulfillment_method else null end,
    case when listing.type = 'physical' and fulfillment_method = 'delivery' then btrim(delivery_address) else null end,
    case when listing.type = 'physical' and fulfillment_method = 'pickup' then listing.pickup_location else null end
  )
  returning id into new_order_id;

  update public.products
  set stock = stock - quantity,
      updated_at = now()
  where id = listing.id;

  return new_order_id;
end;
$$;

revoke all on function public.marketplace_create_order(uuid, integer, text, text, text) from public, anon;
grant execute on function public.marketplace_create_order(uuid, integer, text, text, text) to authenticated;

create or replace function public.marketplace_submit_payment_reference(order_id uuid, transaction_reference text)
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

  if not found or order_row.buyer_id is distinct from auth.uid() then
    raise exception 'Order not found';
  end if;
  if order_row.payment_method not in ('bkash', 'nagad')
     or order_row.payment_status <> 'pending' then
    raise exception 'This order is not awaiting an online payment reference';
  end if;
  if char_length(btrim(coalesce(transaction_reference, ''))) not between 6 and 80 then
    raise exception 'Transaction reference must be between 6 and 80 characters';
  end if;

  update public.orders
  set payment_reference = btrim(transaction_reference),
      payment_status = 'verification_pending',
      updated_at = now()
  where id = order_row.id;
end;
$$;

revoke all on function public.marketplace_submit_payment_reference(uuid, text) from public, anon;
grant execute on function public.marketplace_submit_payment_reference(uuid, text) to authenticated;

drop view if exists public.marketplace_seller_orders;
create or replace view public.marketplace_seller_orders
with (security_invoker = false)
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
  orders.fulfillment_method,
  orders.pickup_location,
  case when buyer.role = 'student' then 'শিক্ষার্থী ক্রেতা' else coalesce(buyer.full_name, 'ক্রেতা') end as buyer_label,
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
join public.profiles as buyer on buyer.id = orders.buyer_id
where orders.seller_id = auth.uid();

create or replace view public.marketplace_buyer_orders
with (security_invoker = false)
as
select
  orders.id,
  orders.buyer_id,
  orders.product_id,
  products.title as product_title,
  products.type as product_type,
  products.seller_type,
  case
    when products.seller_type = 'platform' then 'Luvevo Official'
    when products.seller_type = 'student' then 'Student'
    else coalesce(seller.full_name, 'যাচাইকৃত টিউটর')
  end as seller_label,
  orders.quantity,
  orders.amount,
  orders.commission_amount,
  orders.payment_method,
  orders.payment_status,
  orders.payment_reference,
  orders.order_status,
  orders.fulfillment_method,
  orders.pickup_location,
  orders.delivery_address,
  orders.created_at
from public.orders
join public.products on products.id = orders.product_id
left join public.profiles as seller on seller.id = orders.seller_id
where orders.buyer_id = auth.uid();

revoke all on public.marketplace_seller_orders, public.marketplace_buyer_orders from public, anon;
grant select on public.marketplace_seller_orders, public.marketplace_buyer_orders to authenticated;

-- Clients read order data only through role-specific views and mutate it through RPCs.
revoke all on public.orders from authenticated;
