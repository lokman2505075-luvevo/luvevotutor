-- Marketplace phase 3: public seller profile details and in-platform messages.
-- Apply after 202610070002_marketplace_seller_dashboard.sql.

create table if not exists public.marketplace_messages (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint marketplace_messages_body_length check (char_length(btrim(body)) between 1 and 2000),
  constraint marketplace_messages_distinct_users check (sender_id <> recipient_id)
);

create index if not exists marketplace_messages_sender_idx
  on public.marketplace_messages (sender_id, created_at desc);
create index if not exists marketplace_messages_recipient_idx
  on public.marketplace_messages (recipient_id, created_at desc);
create index if not exists marketplace_messages_product_idx
  on public.marketplace_messages (product_id, created_at);

insert into public.products (
  id, seller_id, seller_type, title, description, category, level, type,
  price, condition, stock, delivery_available, status
)
values
  ('0e5a776e-1964-4ce7-855e-6044c7190001', null, 'platform', 'হাতিয়ার কিট - গণিত', 'গণিত অনুশীলনের জন্য Luvevo শিক্ষাসামগ্রী।', 'গণিত', null, 'physical', 500, 'new', 100, true, 'approved'),
  ('0e5a776e-1964-4ce7-855e-6044c7190002', null, 'platform', 'লার্নিং বোর্ড', 'শেখাকে সহজ করার জন্য শিক্ষামূলক বোর্ড।', 'অন্যান্য', null, 'physical', 1200, 'new', 100, true, 'approved'),
  ('0e5a776e-1964-4ce7-855e-6044c7190003', null, 'platform', 'বইলেট প্যাক', 'পড়াশোনার সহায়ক বইলেট প্যাক।', 'বই', null, 'physical', 300, 'new', 100, true, 'approved'),
  ('0e5a776e-1964-4ce7-855e-6044c7190004', null, 'platform', 'স্মার্ট নোটবুক', 'শিক্ষার্থীদের জন্য স্মার্ট নোটবুক।', 'স্টেশনারি', null, 'physical', 750, 'new', 100, true, 'approved'),
  ('0e5a776e-1964-4ce7-855e-6044c7190005', null, 'platform', 'প্র্যাকটিস সেট', 'বিষয়ভিত্তিক অনুশীলন সেট।', 'অন্যান্য', null, 'physical', 450, 'new', 100, true, 'approved'),
  ('0e5a776e-1964-4ce7-855e-6044c7190006', null, 'platform', 'টিউশন অ্যাসেসর', 'পড়াশোনার জন্য প্রয়োজনীয় Luvevo সামগ্রী।', 'অন্যান্য', null, 'physical', 1000, 'new', 100, true, 'approved')
on conflict (id) do nothing;

alter table public.marketplace_messages enable row level security;

drop policy if exists marketplace_messages_participant_select on public.marketplace_messages;
create policy marketplace_messages_participant_select
  on public.marketplace_messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

drop policy if exists marketplace_messages_buyer_insert on public.marketplace_messages;
create policy marketplace_messages_buyer_insert
  on public.marketplace_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.products
      where products.id = marketplace_messages.product_id
        and products.status = 'approved'
        and products.seller_id = marketplace_messages.recipient_id
        and products.seller_id <> auth.uid()
    )
  );

revoke all on public.marketplace_messages from anon, authenticated;
grant select, insert on public.marketplace_messages to authenticated;

create or replace function public.marketplace_send_message(product_id uuid, message_body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to message a seller';
  end if;
  if char_length(btrim(message_body)) not between 1 and 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;

  select seller_id into recipient
  from public.products
  where id = product_id
    and status = 'approved'
    and seller_id is not null
    and seller_id <> auth.uid();

  if recipient is null then
    raise exception 'This seller cannot be messaged';
  end if;

  insert into public.marketplace_messages (product_id, sender_id, recipient_id, body)
  values (product_id, auth.uid(), recipient, btrim(message_body))
  returning id into message_id;
  return message_id;
end;
$$;

revoke all on function public.marketplace_send_message(uuid, text) from public, anon;
grant execute on function public.marketplace_send_message(uuid, text) to authenticated;

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
  coalesce(products.seller_id = auth.uid(), false) as is_owner
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
