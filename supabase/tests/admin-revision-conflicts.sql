begin;
-- Business revision conflicts must not trigger PostgREST transaction retries.
do $$begin
 if pg_get_functiondef('public.permission_update(uuid,text,boolean,timestamptz,integer,text)'::regprocedure) like '%40001%'
 or pg_get_functiondef('public.permission_group_update(jsonb,text)'::regprocedure) like '%40001%'
 or pg_get_functiondef('picket_private.admin_mutate(text,jsonb,text,uuid)'::regprocedure) like '%40001%' then
  raise exception 'Business revision guards still use a transient retry SQLSTATE';
 end if;
end$$;
insert into auth.users(id,email,email_confirmed_at) values
 ('ed000000-0000-4000-8000-000000000001','revision-owner@example.test',now()),
 ('ed000000-0000-4000-8000-000000000002','revision-target@example.test',now());
insert into public.staff_members(user_id,role) values('ed000000-0000-4000-8000-000000000001','owner');
select set_config('request.jwt.claim.sub','ed000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$declare g jsonb; audits bigint;begin
 g:=public.permission_group_update('{"action":"save","name":"Revision conflict fixture","revision":0,"permissions":["revenue.read"]}','Create revision conflict fixture');
 perform public.permission_group_update(jsonb_build_object('action','save','id',g->>'id','name','Revision conflict fixture','revision',1,'permissions',jsonb_build_array('payments.read')),'Update revision conflict fixture');
 begin
  perform public.permission_group_update(jsonb_build_object('action','save','id',g->>'id','name','Revision conflict fixture','revision',1,'permissions',jsonb_build_array('revenue.read')),'Stale update must return HTTP conflict');
  raise exception 'Stale group revision unexpectedly accepted';
 exception when sqlstate 'PT409' then null;end;
 perform public.permission_update('ed000000-0000-4000-8000-000000000002','revenue.read',true,null,0,'Create revision rule fixture');
 begin
  perform public.permission_update('ed000000-0000-4000-8000-000000000002','revenue.read',false,null,0,'Stale permission must return HTTP conflict');
  raise exception 'Stale user rule unexpectedly accepted';
 exception when sqlstate 'PT409' then null;end;
end$$;
reset role;
do $$begin
 if (select revision from public.permission_groups where name='Revision conflict fixture')<>2
 or (select count(*) from public.permission_group_rules r join public.permission_groups g on g.id=r.group_id where g.name='Revision conflict fixture' and permission='payments.read')<>1
 or not (select allowed from public.user_permissions where user_id='ed000000-0000-4000-8000-000000000002' and permission='revenue.read') then
  raise exception 'Stale update changed current group or user rule';
 end if;
 if (select count(*) from public.permission_audit where actor='ed000000-0000-4000-8000-000000000001')<>3 then
  raise exception 'Rejected revision conflict added audit events';
 end if;
end$$;
rollback;
