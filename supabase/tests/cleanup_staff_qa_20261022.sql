-- Optional SQL-owner cleanup; NOT a migration. Only known inactive QA fixtures.
-- Read the acceptance report before running. Never widen API table privileges.
begin;
do $$
declare matched integer;
begin
  if (select count(*) from public.partner_ads where title = 'QA inactive bc87a254') > 1
  then raise exception 'Duplicate legacy QA title; inspect exact IDs manually'; end if;
  if exists (
    select 1 from public.partner_ads
    where (id = '911c6e3b-51b4-4a6c-8ca5-c332b1108c54'::uuid
      or title = 'QA inactive bc87a254')
      and (active or url <> 'https://example.com/picket-qa'
        or title not in ('QA inactive bc87a254', 'QA updated 782288eb'))
  ) then raise exception 'QA fixture identity/state changed; inspect manually'; end if;
  select count(*) into matched from public.partner_ads
  where not active and url = 'https://example.com/picket-qa'
    and ((title = 'QA inactive bc87a254')
      or (id = '911c6e3b-51b4-4a6c-8ca5-c332b1108c54'::uuid
        and title = 'QA updated 782288eb'));
  if matched > 2 then raise exception 'Ambiguous QA cleanup candidates'; end if;
  delete from public.partner_ads
  where not active and url = 'https://example.com/picket-qa'
    and ((title = 'QA inactive bc87a254')
      or (id = '911c6e3b-51b4-4a6c-8ca5-c332b1108c54'::uuid
        and title = 'QA updated 782288eb'));
end $$;
commit;
