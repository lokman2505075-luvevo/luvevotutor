-- Marketplace phase 6: reviews, reports, and marketplace administration.
-- Apply after 202610070005_marketplace_buyer_orders_downloads.sql.

create table if not exists public.marketplace_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid references public.profiles(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  constraint marketplace_review_comment_length check (char_length(comment) <= 1000)
);

create index if not exists marketplace_reviews_seller_idx
  on public.marketplace_reviews (seller_id, created_at desc);

create table if not exists public.marketplace_reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('copyright', 'fake', 'wrong_info', 'spam', 'other')),
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint marketplace_report_details_length check (char_length(details) <= 1000),
  constraint marketplace_report_resolution_length check (resolution_note is null or char_length(resolution_note) <= 1000)
);

create index if not exists marketplace_reports_status_created_idx
  on public.marketplace_reports (status, created_at desc);

alter table public.marketplace_reviews enable row level security;
alter table public.marketplace_reports enable row level security;

drop policy if exists marketplace_reviews_buyer_select on public.marketplace_reviews;
drop policy if exists marketplace_reviews_admin_select on public.marketplace_reviews;
create policy marketplace_reviews_buyer_select
  on public.marketplace_reviews for select to authenticated
  using (buyer_id = auth.uid());
create policy marketplace_reviews_admin_select
  on public.marketplace_reviews for select to authenticated
  using (public.is_admin());

drop policy if exists marketplace_reports_reporter_select on public.marketplace_reports;
drop policy if exists marketplace_reports_admin_all on public.marketplace_reports;
create policy marketplace_reports_reporter_select
  on public.marketplace_reports for select to authenticated
  using (reporter_id = auth.uid());
create policy marketplace_reports_admin_all
  on public.marketplace_reports for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.marketplace_reviews, public.marketplace_reports from anon, authenticated;
grant select on public.marketplace_reviews, public.marketplace_reports to authenticated;
grant update on public.marketplace_reports to authenticated;
grant update on public.seller_payouts to authenticated;

create or replace function public.marketplace_submit_review(
  target_order_id uuid,
  review_rating smallint,
  review_comment text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  product_seller_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to review this purchase';
  end if;
  if review_rating is null or review_rating not between 1 and 5
     or char_length(btrim(coalesce(review_comment, ''))) > 1000 then
    raise exception 'Review rating or comment is invalid';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found
     or order_row.buyer_id is distinct from auth.uid()
     or order_row.payment_status <> 'paid'
     or order_row.order_status <> 'completed' then
    raise exception 'Only a completed paid order can be reviewed';
  end if;

  select seller_id into product_seller_id
  from public.products
  where id = order_row.product_id;

  insert into public.marketplace_reviews (
    order_id, product_id, buyer_id, seller_id, rating, comment
  )
  values (
    order_row.id, order_row.product_id, auth.uid(), product_seller_id,
    review_rating, btrim(coalesce(review_comment, ''))
  );
end;
$$;

revoke all on function public.marketplace_submit_review(uuid, smallint, text) from public, anon;
grant execute on function public.marketplace_submit_review(uuid, smallint, text) to authenticated;

create or replace function public.marketplace_report_listing(
  target_product_id uuid,
  report_reason text,
  report_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  report_id uuid;
  seller_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to report a listing';
  end if;
  if report_reason is null or report_reason not in ('copyright', 'fake', 'wrong_info', 'spam', 'other')
     or char_length(btrim(coalesce(report_details, ''))) > 1000 then
    raise exception 'Report reason or details are invalid';
  end if;

  select products.seller_id into seller_id
  from public.products
  where products.id = target_product_id
    and products.status = 'approved'
  for update;
  if not found then
    raise exception 'Listing not found';
  end if;
  if seller_id is not distinct from auth.uid() then
    raise exception 'You cannot report your own listing';
  end if;

  insert into public.marketplace_reports (product_id, reporter_id, reason, details)
  values (
    target_product_id, auth.uid(), report_reason,
    btrim(coalesce(report_details, ''))
  )
  returning id into report_id;

  if report_reason = 'copyright' then
    update public.products
    set status = 'pending', updated_at = now()
    where id = target_product_id;
  end if;

  return report_id;
end;
$$;

revoke all on function public.marketplace_report_listing(uuid, text, text) from public, anon;
grant execute on function public.marketplace_report_listing(uuid, text, text) to authenticated;

create or replace function public.marketplace_complete_order(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  product_type text;
begin
  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found or order_row.buyer_id is distinct from auth.uid() then
    raise exception 'Order not found';
  end if;
  select type into product_type from public.products where id = order_row.product_id;
  if product_type <> 'physical' or order_row.order_status <> 'delivered' then
    raise exception 'Only a delivered physical order can be completed';
  end if;
  if order_row.payment_method <> 'cod' and order_row.payment_status <> 'paid' then
    raise exception 'Payment must be confirmed before completing this order';
  end if;

  update public.orders
  set order_status = 'completed',
      payment_status = case when payment_method = 'cod' then 'paid' else payment_status end,
      updated_at = now()
  where id = order_row.id;
end;
$$;

revoke all on function public.marketplace_complete_order(uuid) from public, anon;
grant execute on function public.marketplace_complete_order(uuid) to authenticated;

create or replace function public.marketplace_admin_verify_payment(
  target_order_id uuid,
  decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  product_type text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;
  if decision not in ('paid', 'failed') then
    raise exception 'Payment decision is invalid';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;
  if not found
     or order_row.payment_status <> 'verification_pending'
     or order_row.payment_method not in ('bkash', 'nagad') then
    raise exception 'Order is not awaiting payment verification';
  end if;

  select type into product_type from public.products where id = order_row.product_id;
  if decision = 'paid' then
    update public.orders
    set payment_status = 'paid',
        order_status = case when product_type = 'digital' then 'completed' else 'confirmed' end,
        payment_verified_by = auth.uid(),
        payment_verified_at = now(),
        updated_at = now()
    where id = order_row.id;
  else
    update public.orders
    set payment_status = 'failed',
        order_status = 'cancelled',
        payment_verified_by = auth.uid(),
        payment_verified_at = now(),
        updated_at = now()
    where id = order_row.id;
    update public.products
    set stock = stock + order_row.quantity,
        updated_at = now()
    where id = order_row.product_id;
  end if;
end;
$$;

revoke all on function public.marketplace_admin_verify_payment(uuid, text) from public, anon;
grant execute on function public.marketplace_admin_verify_payment(uuid, text) to authenticated;

create or replace view public.marketplace_admin_orders
with (security_invoker = false)
as
select
  orders.id,
  orders.product_id,
  products.title as product_title,
  products.type as product_type,
  orders.seller_id,
  orders.buyer_id,
  case when buyer.role = 'student' then 'শিক্ষার্থী ক্রেতা' else coalesce(buyer.full_name, 'ক্রেতা') end as buyer_label,
  orders.quantity,
  orders.amount,
  orders.commission_percent,
  orders.commission_amount,
  orders.seller_earning,
  orders.payment_method,
  orders.payment_status,
  orders.payment_reference,
  orders.order_status,
  orders.created_at
from public.orders
join public.products on products.id = orders.product_id
join public.profiles as buyer on buyer.id = orders.buyer_id
where public.is_admin();

revoke all on public.marketplace_admin_orders from public, anon;
grant select on public.marketplace_admin_orders to authenticated;

drop view if exists public.public_marketplace_products;
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
  coalesce(marketplace_rating.average_rating, case when products.seller_type = 'tutor' then profiles.rating end)::numeric(3, 2) as seller_rating,
  coalesce(marketplace_rating.review_count, case when products.seller_type = 'tutor' then profiles.review_count else null end) as seller_review_count,
  coalesce(sales.popularity_count, 0) as popularity_count,
  coalesce(products.seller_id = auth.uid(), false) as is_owner,
  products.pickup_location
from public.products
left join public.profiles on profiles.id = products.seller_id
left join lateral (
  select round(avg(reviews.rating)::numeric, 2) as average_rating, count(*)::integer as review_count
  from public.marketplace_reviews as reviews
  where reviews.seller_id = products.seller_id
) as marketplace_rating on true
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
