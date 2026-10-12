-- Marketplace phase 5: buyer order history and bounded digital downloads.
-- Apply after 202610070004_marketplace_checkout.sql.

create table if not exists public.marketplace_download_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

create index if not exists marketplace_download_logs_order_idx
  on public.marketplace_download_logs (order_id, downloaded_at desc);
create index if not exists marketplace_download_logs_buyer_idx
  on public.marketplace_download_logs (buyer_id, downloaded_at desc);

alter table public.marketplace_download_logs enable row level security;
drop policy if exists marketplace_download_logs_buyer_select on public.marketplace_download_logs;
drop policy if exists marketplace_download_logs_admin_select on public.marketplace_download_logs;
create policy marketplace_download_logs_buyer_select
  on public.marketplace_download_logs for select to authenticated
  using (buyer_id = auth.uid());
create policy marketplace_download_logs_admin_select
  on public.marketplace_download_logs for select to authenticated
  using (public.is_admin());

revoke all on public.marketplace_download_logs from anon, authenticated;
grant select on public.marketplace_download_logs to authenticated;

create or replace function public.marketplace_authorize_download(target_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  download_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to download this product';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found
     or order_row.buyer_id is distinct from auth.uid()
     or order_row.payment_status <> 'paid'
     or order_row.order_status <> 'completed' then
    raise exception 'This order is not eligible for download';
  end if;

  if not exists (
    select 1
    from public.products
    join public.product_files on product_files.product_id = products.id
    where products.id = order_row.product_id
      and products.type = 'digital'
  ) then
    raise exception 'The digital file is not available';
  end if;

  select count(*) into download_count
  from public.marketplace_download_logs
  where order_id = target_order_id
    and buyer_id = auth.uid();

  if download_count >= 5 then
    raise exception 'The download limit has been reached';
  end if;

  insert into public.marketplace_download_logs (order_id, buyer_id, product_id)
  values (order_row.id, auth.uid(), order_row.product_id);

  return 4 - download_count;
end;
$$;

revoke all on function public.marketplace_authorize_download(uuid) from public, anon;
grant execute on function public.marketplace_authorize_download(uuid) to authenticated;
