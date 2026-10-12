-- Allow sellers to reply to buyers from the marketplace inbox.
-- Apply after 202610070006_marketplace_reviews_reports_admin.sql.

drop policy if exists marketplace_messages_buyer_insert on public.marketplace_messages;
create policy marketplace_messages_participant_insert
  on public.marketplace_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1 from public.products
        where products.id = marketplace_messages.product_id
          and products.status = 'approved'
          and products.seller_id = marketplace_messages.recipient_id
          and products.seller_id <> auth.uid()
      )
      or exists (
        select 1 from public.marketplace_messages as prior_message
        where prior_message.product_id = marketplace_messages.product_id
          and prior_message.sender_id = marketplace_messages.recipient_id
          and prior_message.recipient_id = auth.uid()
      )
    )
  );

drop function if exists public.marketplace_send_message(uuid, text);
create function public.marketplace_send_message(product_id uuid, message_body text, recipient_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  product_seller_id uuid;
  target_recipient uuid;
  message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to message a seller';
  end if;
  if char_length(btrim(coalesce($2, ''))) not between 1 and 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;

  select seller_id into product_seller_id
  from public.products
  where id = $1
    and status = 'approved';

  if product_seller_id is null then
    raise exception 'This seller cannot be messaged';
  end if;

  if product_seller_id = auth.uid() then
    target_recipient := $3;
    if target_recipient is null or not exists (
      select 1
      from public.marketplace_messages
      where marketplace_messages.product_id = $1
        and marketplace_messages.sender_id = target_recipient
        and marketplace_messages.recipient_id = auth.uid()
    ) then
      raise exception 'No buyer conversation exists for this listing';
    end if;
  else
    if $3 is not null then
      raise exception 'Buyers cannot choose a message recipient';
    end if;
    target_recipient := product_seller_id;
  end if;

  insert into public.marketplace_messages (product_id, sender_id, recipient_id, body)
  values ($1, auth.uid(), target_recipient, btrim($2))
  returning id into message_id;
  return message_id;
end;
$$;

revoke all on function public.marketplace_send_message(uuid, text, uuid) from public, anon;
grant execute on function public.marketplace_send_message(uuid, text, uuid) to authenticated;
