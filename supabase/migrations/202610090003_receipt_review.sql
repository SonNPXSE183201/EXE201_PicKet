-- Atomically replaces reviewed receipt metadata and line items. Optimistic
-- locking prevents a stale mobile session from overwriting another device.
create function public.update_receipt_record(
  p_id uuid,
  p_expected_version bigint,
  p_merchant text,
  p_detected_total bigint,
  p_purchased_at timestamptz,
  p_review_required boolean,
  p_line_items jsonb
) returns public.receipts
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  receipt public.receipts;
  item jsonb;
  item_quantity numeric;
  item_unit_price bigint;
  item_total bigint;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_expected_version is null or p_expected_version < 1
      or p_detected_total is not null
        and (p_detected_total <= 0 or p_detected_total > 9000000000000)
      or p_merchant is not null and length(trim(p_merchant)) > 160
      or p_review_required is null
      or p_line_items is null
      or jsonb_typeof(p_line_items) <> 'array'
      or jsonb_array_length(p_line_items) > 100 then
    raise exception 'RECEIPT_REVIEW_INVALID' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.receipts
    where id = p_id and user_id = owner_id and archived_at is null
  ) then
    raise exception 'RECEIPT_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.receipts
  set merchant = nullif(trim(p_merchant), ''),
      detected_total = p_detected_total,
      purchased_at = p_purchased_at,
      review_required = p_review_required,
      status = case when p_review_required then 'review_required' else 'confirmed' end
  where id = p_id and user_id = owner_id and archived_at is null
    and row_version = p_expected_version
  returning * into receipt;

  if receipt.id is null then
    raise exception 'RECEIPT_VERSION_CONFLICT' using errcode = '40001';
  end if;

  delete from public.receipt_line_items
  where user_id = owner_id and receipt_id = p_id;

  for item in select value from jsonb_array_elements(p_line_items) loop
    if jsonb_typeof(item) <> 'object'
        or item->>'name' is null
        or length(trim(item->>'name')) not between 1 and 200
        or item->>'total' is null then
      raise exception 'RECEIPT_LINES_INVALID' using errcode = '22023';
    end if;
    begin
      item_quantity := coalesce((item->>'quantity')::numeric, 1);
      item_unit_price := (item->>'unitPrice')::bigint;
      item_total := (item->>'total')::bigint;
    exception when others then
      raise exception 'RECEIPT_LINES_INVALID' using errcode = '22023';
    end;
    if item_quantity <= 0 or item_quantity > 1000000
        or item_total <= 0 or item_total > 9000000000000
        or item_unit_price is not null and (
          item_unit_price < 0 or item_unit_price > 9000000000000
          or abs(item_total - round(item_quantity * item_unit_price)) > 1
        )
        or item->>'confidence' is not null and (
          (item->>'confidence')::numeric < 0
          or (item->>'confidence')::numeric > 1
        ) then
      raise exception 'RECEIPT_LINES_INVALID' using errcode = '22023';
    end if;
    insert into public.receipt_line_items(
      user_id, receipt_id, name, quantity, unit_price, total, confidence
    ) values (
      owner_id, p_id, trim(item->>'name'), item_quantity, item_unit_price,
      item_total, (item->>'confidence')::numeric
    );
  end loop;
  return receipt;
end;
$$;

revoke all on function public.update_receipt_record(
  uuid, bigint, text, bigint, timestamptz, boolean, jsonb
) from public;
grant execute on function public.update_receipt_record(
  uuid, bigint, text, bigint, timestamptz, boolean, jsonb
) to authenticated;
