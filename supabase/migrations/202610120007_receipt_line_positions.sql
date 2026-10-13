-- Preserve the source receipt order. created_at is identical for line items
-- inserted by one RPC and UUID ordering is random, so it cannot represent the
-- order users reviewed in the client.
alter table public.receipt_line_items add column position integer;

with ranked as (
  select id, row_number() over (
    partition by user_id, receipt_id order by created_at, id
  ) - 1 as position
  from public.receipt_line_items
)
update public.receipt_line_items item
set position = ranked.position
from ranked
where item.id = ranked.id;

create function public.assign_receipt_line_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.position is null then
    select coalesce(max(item.position) + 1, 0)
    into new.position
    from public.receipt_line_items item
    where item.user_id = new.user_id and item.receipt_id = new.receipt_id;
  end if;
  return new;
end;
$$;

create trigger receipt_line_items_assign_position
before insert on public.receipt_line_items
for each row execute function public.assign_receipt_line_position();

alter table public.receipt_line_items
  alter column position set not null,
  add constraint receipt_line_items_position_check check (position between 0 and 99),
  add constraint receipt_line_items_position_unique unique (user_id, receipt_id, position);

revoke all on function public.assign_receipt_line_position() from public;
