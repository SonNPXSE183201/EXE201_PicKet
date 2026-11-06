-- Incremental, optimistic-concurrency CRUD for the Expo keepsake collection.
alter table public.keepsakes
  add column row_version bigint not null default 1 check (row_version > 0),
  add column archived_at timestamptz;

create trigger keepsakes_increment_version
before update on public.keepsakes
for each row execute function public.increment_row_version();

create index keepsakes_active_owner_date_idx
on public.keepsakes(user_id, purchased_at desc, id desc)
where archived_at is null;
