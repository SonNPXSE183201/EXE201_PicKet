begin;
insert into auth.users(id,email) values('44444444-1234-4321-8123-123456789001','restore-transfer@example.test'),('44444444-1234-4321-8123-123456789002','restore-other@example.test');
insert into public.profiles(id) values('44444444-1234-4321-8123-123456789001'),('44444444-1234-4321-8123-123456789002') on conflict do nothing;
insert into public.wallets(id,user_id,name,opening_balance,currency_code) values
 ('44444444-1234-4321-8123-123456789011','44444444-1234-4321-8123-123456789001','Cash',500000,'VND'),
 ('44444444-1234-4321-8123-123456789012','44444444-1234-4321-8123-123456789001','Bank',800000,'VND');
insert into public.categories(id,user_id,name,kind,is_custom,icon) values
 ('44444444-1234-4321-8123-123456789031','44444444-1234-4321-8123-123456789001','Cà phê sáng','expense',true,'coffee'),
 ('44444444-1234-4321-8123-123456789032','44444444-1234-4321-8123-123456789002','Other owner category','expense',true,null);
insert into public.transactions(id,user_id,wallet_id,destination_wallet_id,title,amount,kind,occurred_at,note) values
 ('44444444-1234-4321-8123-123456789021','44444444-1234-4321-8123-123456789001','44444444-1234-4321-8123-123456789011','44444444-1234-4321-8123-123456789012','Rút tiền',200000,'transfer',now()-interval '2 day','');
insert into public.transactions(id,user_id,wallet_id,category_id,title,amount,kind,occurred_at,note) values
 ('44444444-1234-4321-8123-123456789022','44444444-1234-4321-8123-123456789001','44444444-1234-4321-8123-123456789011','44444444-1234-4321-8123-123456789031','Cà phê',45000,'expense',now()-interval '1 day','');
insert into public.budgets(id,user_id,category_id,name,default_limit) values
 ('44444444-1234-4321-8123-123456789041','44444444-1234-4321-8123-123456789001','44444444-1234-4321-8123-123456789031','Cà phê sáng',300000);
set local role authenticated;
select set_config('request.jwt.claim.sub','44444444-1234-4321-8123-123456789001',true);
do $$ declare snapshot jsonb; payload jsonb; revision bigint;
begin
 snapshot:=public.load_normalized_finance(); payload:=snapshot->'payload';
 if not exists(select 1 from jsonb_array_elements(payload->'categories') c where c->>'id'='44444444-1234-4321-8123-123456789031' and c->>'icon'='coffee') then raise exception 'Export lost category ids'; end if;
 if exists(select 1 from jsonb_array_elements(payload->'categories') c where c->>'name'='Other owner category') then raise exception 'Export leaked another owner category'; end if;
 -- The import contract still requires a category label on every entry, transfers included.
 if not exists(select 1 from jsonb_array_elements(payload->'entries') e where e->>'type'='transfer' and e->>'category'='Khác') then raise exception 'Transfer export label changed'; end if;

 -- A backup with a wallet transfer restores (previously: Transfer cannot have a category).
 revision:=public.save_normalized_finance((snapshot->>'revision')::bigint,payload);
 if (select category_id from public.transactions where id='44444444-1234-4321-8123-123456789021') is not null then raise exception 'Transfer restored with a category'; end if;
 if (select kind from public.transactions where id='44444444-1234-4321-8123-123456789021')<>'transfer' then raise exception 'Transfer kind lost'; end if;
 -- Category ids survive restore, so budgets and old references keep working.
 if (select category_id from public.transactions where id='44444444-1234-4321-8123-123456789022')<>'44444444-1234-4321-8123-123456789031' then raise exception 'Category id changed on restore'; end if;
 if (select category_id from public.budgets where id='44444444-1234-4321-8123-123456789041')<>'44444444-1234-4321-8123-123456789031' then raise exception 'Budget category id changed'; end if;
 if (select icon from public.categories where id='44444444-1234-4321-8123-123456789031')<>'coffee' then raise exception 'Category icon lost'; end if;
 if exists(select 1 from public.categories where user_id=auth.uid() and name='Khác' and is_custom) then raise exception 'Transfer label became a custom category'; end if;

 -- An old backup (no "categories", transfer labelled "Khác") still restores by name.
 payload:=payload-'categories';
 revision:=public.save_normalized_finance(revision,payload);
 if (select category_id from public.transactions where id='44444444-1234-4321-8123-123456789021') is not null then raise exception 'Legacy transfer restored with a category'; end if;
 if not exists(select 1 from public.categories where user_id=auth.uid() and name='Cà phê sáng') then raise exception 'Legacy category missing'; end if;

 -- A crafted payload cannot take another owner's category id.
 payload:=jsonb_set(payload,'{categories}',jsonb_build_array(jsonb_build_object('id','44444444-1234-4321-8123-123456789032','name','Stolen','kind','expense')));
 revision:=public.save_normalized_finance(revision,payload);
 if (select user_id from public.categories where id='44444444-1234-4321-8123-123456789032')<>'44444444-1234-4321-8123-123456789002' then raise exception 'Category id taken from another owner'; end if;
end $$;
rollback;
