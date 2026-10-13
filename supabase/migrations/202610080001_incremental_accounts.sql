-- First incremental domain slice. Snapshot RPCs remain read-compatible during migration.
alter table public.wallets
  add column kind text not null default 'cash'
    check (kind in ('cash','bank','ewallet','other')),
  add column row_version bigint not null default 1
    check (row_version > 0);

create function public.increment_row_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.row_version = old.row_version + 1;
  return new;
end;
$$;

revoke all on function public.increment_row_version() from public;

create trigger wallets_increment_version
before update on public.wallets
for each row execute function public.increment_row_version();

create index wallets_active_owner_idx
  on public.wallets(user_id, created_at, id)
  where archived_at is null;
