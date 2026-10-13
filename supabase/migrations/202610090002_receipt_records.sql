-- Structured receipts and line items become server-authoritative. Exact hashes
-- prevent duplicate uploads; a read-only RPC also reports likely duplicates.
alter table public.receipts
  drop constraint if exists receipts_storage_path_check,
  add column purchased_at timestamptz,
  add column currency_code text not null default 'VND'
    check (currency_code ~ '^[A-Z]{3}$'),
  add column raw_text text check (raw_text is null or length(raw_text) <= 32000),
  add column image_sha256 text check (
    image_sha256 is null or image_sha256 ~ '^[0-9a-f]{64}$'
  ),
  add column status text not null default 'review_required' check (
    status in ('processing', 'review_required', 'confirmed', 'failed')
  ),
  add column row_version bigint not null default 1 check (row_version > 0),
  add column archived_at timestamptz,
  add constraint receipts_storage_path_check check (
    length(storage_path) between 1 and 1024
  );

create trigger receipts_increment_version
before update on public.receipts
for each row execute function public.increment_row_version();

create unique index receipts_owner_image_hash_unique
  on public.receipts(user_id, image_sha256)
  where image_sha256 is not null and archived_at is null;
create index receipts_owner_fuzzy_duplicate_idx
  on public.receipts(user_id, detected_total, purchased_at)
  where archived_at is null;

create table public.receipt_line_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  receipt_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 200),
  quantity numeric(10,3) not null default 1 check (quantity > 0),
  unit_price bigint check (
    unit_price is null or (unit_price >= 0 and unit_price <= 9000000000000)
  ),
  total bigint not null check (total > 0 and total <= 9000000000000),
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  row_version bigint not null default 1 check (row_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint receipt_line_item_receipt foreign key (user_id, receipt_id)
    references public.receipts(user_id, id) on delete cascade,
  constraint receipt_line_item_total check (
    unit_price is null or abs(total - round(quantity * unit_price)) <= 1
  )
);

create index receipt_line_items_receipt_idx
  on public.receipt_line_items(user_id, receipt_id, created_at, id);
create trigger receipt_line_items_updated_at
before update on public.receipt_line_items
for each row execute function public.set_updated_at();
create trigger receipt_line_items_increment_version
before update on public.receipt_line_items
for each row execute function public.increment_row_version();

alter table public.receipt_line_items enable row level security;
alter function public.save_normalized_finance(bigint, jsonb) security definer;
revoke all on public.receipts, public.receipt_line_items from anon, authenticated;
grant select on public.receipts, public.receipt_line_items to authenticated;
create policy receipt_line_items_owner_read
  on public.receipt_line_items for select to authenticated
  using (user_id = (select auth.uid()));

create function public.find_duplicate_receipts(
  p_image_sha256 text,
  p_merchant text,
  p_purchased_at timestamptz,
  p_total bigint
) returns table(id uuid, match_type text)
language sql
stable
security definer
set search_path = ''
as $$
  select receipt.id,
    case
      when p_image_sha256 is not null and receipt.image_sha256 = p_image_sha256
        then 'exact_hash'
      else 'merchant_date_total'
    end
  from public.receipts receipt
  where receipt.user_id = auth.uid() and receipt.archived_at is null
    and (
      (p_image_sha256 is not null and receipt.image_sha256 = p_image_sha256)
      or (
        p_merchant is not null and p_purchased_at is not null and p_total is not null
        and lower(trim(receipt.merchant)) = lower(trim(p_merchant))
        and receipt.detected_total = p_total
        and receipt.purchased_at between p_purchased_at - interval '1 day'
          and p_purchased_at + interval '1 day'
      )
    )
  order by case when receipt.image_sha256 = p_image_sha256 then 0 else 1 end,
    receipt.created_at desc
  limit 5;
$$;
revoke all on function public.find_duplicate_receipts(text, text, timestamptz, bigint)
  from public;
grant execute on function public.find_duplicate_receipts(text, text, timestamptz, bigint)
  to authenticated;

create function public.create_receipt_record(
  p_transaction_id uuid,
  p_storage_path text,
  p_merchant text,
  p_detected_total bigint,
  p_purchased_at timestamptz,
  p_currency_code text,
  p_confidence numeric,
  p_ocr_provider text,
  p_review_required boolean,
  p_raw_text text,
  p_image_sha256 text,
  p_line_items jsonb default '[]'::jsonb
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
  if p_storage_path is null or length(p_storage_path) > 1024
      or p_storage_path like '%..%'
      or p_storage_path !~* ('^' || owner_id::text || '/(ocr|receipts)/.+\.(jpg|jpeg|png|webp)$')
      or not exists (
        select 1 from storage.objects
        where bucket_id = 'picket-media' and name = p_storage_path
      ) then
    raise exception 'RECEIPT_IMAGE_INVALID' using errcode = '22023';
  end if;
  if p_transaction_id is not null and not exists (
    select 1 from public.transactions
    where user_id = owner_id and id = p_transaction_id and deleted_at is null
  ) then
    raise exception 'RECEIPT_TRANSACTION_NOT_FOUND' using errcode = '23503';
  end if;
  if jsonb_typeof(p_line_items) <> 'array' or jsonb_array_length(p_line_items) > 100 then
    raise exception 'RECEIPT_LINES_INVALID' using errcode = '22023';
  end if;

  insert into public.receipts(
    user_id, transaction_id, storage_path, merchant, detected_total,
    purchased_at, currency_code, confidence, ocr_provider, review_required,
    raw_text, image_sha256, status
  ) values (
    owner_id, p_transaction_id, p_storage_path, nullif(trim(p_merchant), ''),
    p_detected_total, p_purchased_at, p_currency_code, p_confidence,
    p_ocr_provider, p_review_required, p_raw_text, p_image_sha256,
    case when p_review_required then 'review_required' else 'confirmed' end
  ) returning * into receipt;

  for item in select value from jsonb_array_elements(p_line_items) loop
    item_quantity := coalesce((item->>'quantity')::numeric, 1);
    item_unit_price := (item->>'unitPrice')::bigint;
    item_total := (item->>'total')::bigint;
    insert into public.receipt_line_items(
      user_id, receipt_id, name, quantity, unit_price, total, confidence
    ) values (
      owner_id, receipt.id, item->>'name', item_quantity, item_unit_price,
      item_total, (item->>'confidence')::numeric
    );
  end loop;
  return receipt;
end;
$$;
revoke all on function public.create_receipt_record(
  uuid, text, text, bigint, timestamptz, text, numeric, text, boolean,
  text, text, jsonb
) from public;
grant execute on function public.create_receipt_record(
  uuid, text, text, bigint, timestamptz, text, numeric, text, boolean,
  text, text, jsonb
) to authenticated;
