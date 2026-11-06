-- Budget API requires the same optimistic-concurrency contract as accounts,
-- categories and transactions. Existing records start at version 1.
alter table public.budgets
  add column if not exists row_version bigint not null default 1
    check (row_version > 0),
  add column if not exists archived_at timestamptz;

create trigger budgets_increment_version
before update on public.budgets
for each row execute function public.increment_row_version();

create index if not exists budgets_active_owner_idx
  on public.budgets(user_id, created_at, id)
  where active and archived_at is null;
