-- Deterministic revision conflicts must return HTTP 409 without PostgREST retries.
-- Keep function signatures, MFA checks, ownership checks and ACLs unchanged.
-- See https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions

create or replace function public.permission_update(p_user uuid,p_permission text,p_allowed boolean,p_expires timestamptz,p_revision integer,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare old public.user_permissions; result public.user_permissions;begin
 perform picket_private.permission_require('permissions.manage',true);
 if p_user is null or p_permission is null or p_reason is null or p_revision is null or p_user=auth.uid() or length(trim(p_reason)) not between 5 and 500 or p_allowed is null or (p_expires is not null and p_expires<=now()) then raise exception 'Invalid permission change' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into old from public.user_permissions where user_id=p_user and permission=p_permission;
 if coalesce(old.revision,0)<>p_revision then raise exception 'Permission changed; reload' using errcode='PT409';end if;
 insert into public.user_permissions values(p_user,p_permission,p_allowed,p_expires,coalesce(old.revision,0)+1)
 on conflict(user_id,permission) do update set allowed=excluded.allowed,expires_at=excluded.expires_at,revision=excluded.revision returning * into result;
 insert into public.permission_audit(actor,target,permission,before_value,after_value,reason) values(auth.uid(),p_user,p_permission,to_jsonb(old),to_jsonb(result),p_reason);
 return to_jsonb(result);
end$$;

create or replace function public.permission_group_update(p_body jsonb,p_reason text)returns jsonb language plpgsql security definer set search_path='' as $$
declare g public.permission_groups; gid uuid; target uuid;begin
 perform picket_private.permission_require('permissions.manage',true);
 if p_reason is null or length(trim(p_reason)) not between 5 and 500 then raise exception 'Reason required' using errcode='22023';end if;
 gid:=coalesce((p_body->>'id')::uuid,gen_random_uuid());
 perform pg_advisory_xact_lock(hashtextextended(gid::text,0));
 select * into g from public.permission_groups where id=gid;
 if p_body->>'action'='save' then
  if coalesce(g.revision,0) is distinct from (p_body->>'revision')::integer or jsonb_typeof(p_body->'permissions') is distinct from 'array' then raise exception 'Group changed; reload' using errcode='PT409';end if;
  insert into public.permission_groups(id,name,revision) values(gid,p_body->>'name',coalesce(g.revision,0)+1) on conflict(id) do update set name=excluded.name,revision=excluded.revision;
  delete from public.permission_group_rules where group_id=gid;
  insert into public.permission_group_rules select gid,value from jsonb_array_elements_text(p_body->'permissions') on conflict do nothing;
 elsif p_body->>'action'='member' and g.id is not null then
  target:=(p_body->>'userId')::uuid;
  if target=auth.uid() then raise exception 'Cannot change own membership' using errcode='22023';end if;
  if (p_body->>'enabled')::boolean then insert into public.permission_group_members(user_id,group_id,expires_at) values(target,gid,(p_body->>'expiresAt')::timestamptz) on conflict(user_id,group_id) do update set expires_at=excluded.expires_at;
  else delete from public.permission_group_members where user_id=target and group_id=gid;end if;
 else raise exception 'Invalid group action' using errcode='22023';end if;
 insert into public.permission_audit(actor,target,permission,before_value,after_value,reason)values(auth.uid(),target,'group:'||gid::text,to_jsonb(g),p_body,p_reason);
 return jsonb_build_object('updated',true,'id',gid);
end$$;

create or replace function picket_private.admin_mutate(p_action text,p_body jsonb,p_reason text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_cap text; v_id uuid; v_fingerprint text; v_saved public.admin_mutation_requests; v_result jsonb;
 v_version integer; v_role text; v_target uuid; v_kind text; v_before jsonb;
begin
 v_cap:=case p_action when'revoke_sessions'then'users'when 'ticket' then 'tickets' when 'comment' then 'tickets'when'review_content'then'content'when 'incident' then 'incidents' when 'release' then 'releases' when 'staff' then 'staff' when 'settings' then 'settings' when 'partner' then 'partners' when 'grant' then 'billing' when 'content' then 'content' else null end;
 if v_cap is null then raise exception 'Invalid action' using errcode='22023'; end if;
 perform picket_private.admin_require(v_cap,true);
 if p_request_id is null or p_reason is null or length(trim(p_reason)) not between 5 and 500 or jsonb_typeof(p_body)<>'object' or octet_length(p_body::text)>20000 then raise exception 'Reason and valid request required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 v_fingerprint:=md5(p_action||p_body::text||p_reason);
 select * into v_saved from public.admin_mutation_requests where actor=auth.uid() and request_id=p_request_id;
 if found then
  if v_saved.fingerprint<>v_fingerprint then raise exception 'Idempotency key reused' using errcode='22023'; end if;
  return v_saved.result;
 end if;
 v_id:=coalesce((p_body->>'id')::uuid,(p_body->>'userId')::uuid,gen_random_uuid());
 v_before:=picket_private.admin_snapshot(p_action,v_id);
 if p_action='ticket' then
  if p_body->>'assignee'is not null and not exists(select 1 from public.staff_members where user_id=(p_body->>'assignee')::uuid)then raise exception 'Assignee must be staff'using errcode='22023';end if;
  if p_body->>'id' is null then
   insert into public.admin_tickets(id,title,body,status,priority,category,target_user,assignee) values(v_id,p_body->>'title',coalesce(p_body->>'body',''),coalesce(p_body->>'status','open'),coalesce(p_body->>'priority','normal'),coalesce(p_body->>'category','support'),(p_body->>'targetUser')::uuid,(p_body->>'assignee')::uuid);
  else
   update public.admin_tickets set title=p_body->>'title',body=coalesce(p_body->>'body',''),status=p_body->>'status',priority=p_body->>'priority',category=coalesce(p_body->>'category','support'),target_user=(p_body->>'targetUser')::uuid,assignee=(p_body->>'assignee')::uuid,row_version=row_version+1,updated_at=now() where id=v_id and row_version=(p_body->>'expectedVersion')::integer;
   if not found then raise exception 'Record changed; reload before saving' using errcode='PT409'; end if;
  end if;
 elsif p_action='revoke_sessions'then
  v_target:=(p_body->>'userId')::uuid;
  if v_target=auth.uid()then raise exception 'Use local sign out for your own session'using errcode='23514';end if;
  insert into public.admin_revoked_sessions(session_id,user_id)select id,user_id from auth.sessions where user_id=v_target on conflict(session_id)do nothing;
  v_id:=v_target;
 elsif p_action='comment'then
  insert into public.admin_ticket_comments(ticket_id,author,body)values((p_body->>'ticketId')::uuid,auth.uid(),p_body->>'body');
  v_id:=(p_body->>'ticketId')::uuid;
 elsif p_action='review_content'then
  update public.admin_records set reviewed_by=auth.uid(),reviewed_at=now(),reviewed_hash=md5(body||details::text),status='review',row_version=row_version+1 where id=v_id and kind='content'and updated_by<>auth.uid()and row_version=(p_body->>'expectedVersion')::integer;
  if not found then raise exception 'Independent review or current revision required'using errcode='42501';end if;
 elsif p_action in ('incident','release','content') then
  if p_action='release' and (coalesce(p_body->'details'->>'sha256','')!~'^[a-f0-9]{64}$' or coalesce(p_body->'details'->>'url','')!~'^https://picketfinance[.]com/downloads/[^?]+[.]apk$') then raise exception 'Verified release URL and checksum required' using errcode='22023'; end if;
  if p_action='content'and p_body->>'status'='published'then
   if not exists(select 1 from public.admin_records where id=v_id and kind='content'and reviewed_by is not null and reviewed_by<>updated_by and reviewed_hash=md5(coalesce(p_body->>'body','')||coalesce(p_body->'details','{}'::jsonb)::text))then raise exception 'Independent content review required'using errcode='23514';end if;
  end if;
  if p_body->>'id' is null then
   insert into public.admin_records(id,kind,title,body,status,details,updated_by) values(v_id,p_action,p_body->>'title',coalesce(p_body->>'body',''),coalesce(p_body->>'status',case when p_action='incident' then 'open' else 'draft' end),coalesce(p_body->'details','{}'::jsonb),auth.uid());
  else
   update public.admin_records set title=p_body->>'title',body=coalesce(p_body->>'body',''),status=p_body->>'status',details=coalesce(p_body->'details','{}'::jsonb),row_version=row_version+1,updated_at=now(),updated_by=case when p_action='content'and p_body->>'status'='published'then updated_by else auth.uid()end where id=v_id and kind=p_action and row_version=(p_body->>'expectedVersion')::integer;
   if not found then raise exception 'Record changed; reload before saving' using errcode='PT409'; end if;
  end if;
  if p_action='content'and coalesce(p_body->'details'->>'lessonId','')<>''and p_body->>'status'in('published','archived')then
   update public.learning_answer_keys set published=(p_body->>'status'='published')where lesson_id=p_body->'details'->>'lessonId'and content_version=(p_body->'details'->>'contentVersion')::integer;
   if not found then raise exception 'Linked lesson version not found'using errcode='22023';end if;
  end if;
 elsif p_action='staff' then
  lock table public.staff_members in share row exclusive mode;
  v_target:=(p_body->>'userId')::uuid; v_role:=p_body->>'role';
  if v_role not in ('owner','operations','support','analyst','content','remove') or v_target is null then raise exception 'Invalid staff role' using errcode='22023'; end if;
  if exists(select 1 from public.staff_members where user_id=v_target and role='owner') and v_role<>'owner' and (select count(*) from public.staff_members where role='owner')<=1 then raise exception 'Cannot remove last owner' using errcode='23514'; end if;
  if v_role='remove' then delete from public.staff_members where user_id=v_target;
  else insert into public.staff_members(user_id,role) values(v_target,v_role) on conflict(user_id)do update set role=excluded.role; end if;
  v_id:=v_target;
 elsif p_action='settings' then
  if not picket_private.has_permission('settings.retention.write')and(p_body ? 'analyticsRetentionDays'or p_body ? 'aggregateRetentionMonths')then raise exception 'Owner required for retention policy'using errcode='42501';end if;
  if length(coalesce(p_body->>'notice',''))>1000 or jsonb_typeof(p_body->'maintenance')<>'boolean' then raise exception 'Invalid settings' using errcode='22023'; end if;
  update public.app_settings set maintenance=(p_body->>'maintenance')::boolean,notice=coalesce(p_body->>'notice',''),disk_warning_percent=coalesce((p_body->>'diskWarningPercent')::integer,85),probe_timeout_seconds=coalesce((p_body->>'probeTimeoutSeconds')::integer,8),stale_minutes=coalesce((p_body->>'staleMinutes')::integer,15),analytics_retention_days=coalesce((p_body->>'analyticsRetentionDays')::integer,analytics_retention_days),aggregate_retention_months=coalesce((p_body->>'aggregateRetentionMonths')::integer,aggregate_retention_months),row_version=row_version+1 where id and row_version=(p_body->>'expectedVersion')::integer;
  if not found then raise exception 'Settings changed; reload before saving'using errcode='PT409';end if;
 elsif p_action='partner' then
  if coalesce(p_body->>'url','')!~'^https://[^/@: ]+([/:][^@ ]*)?$' then raise exception 'HTTPS URL required' using errcode='22023'; end if;
  if p_body->>'id'is null then insert into public.partner_ads(id,title,body,url,active,starts_at,ends_at) values(v_id,p_body->>'title',coalesce(p_body->>'body',''),p_body->>'url',coalesce((p_body->>'active')::boolean,false),(p_body->>'startsAt')::timestamptz,(p_body->>'endsAt')::timestamptz);
  else update public.partner_ads set title=p_body->>'title',body=coalesce(p_body->>'body',''),url=p_body->>'url',active=coalesce((p_body->>'active')::boolean,false),starts_at=(p_body->>'startsAt')::timestamptz,ends_at=(p_body->>'endsAt')::timestamptz,row_version=row_version+1 where id=v_id and row_version=(p_body->>'expectedVersion')::integer;
   if not found then raise exception 'Partner record changed; reload'using errcode='PT409';end if;
  end if;
 elsif p_action='grant' then
  if not picket_private.has_permission('billing.write') then raise exception 'Grant permission required' using errcode='42501'; end if;
  v_target:=(p_body->>'userId')::uuid;
  if p_body->>'tier'='free' then delete from public.plan_grants where user_id=v_target;
  elsif p_body->>'tier' in ('plus','pro') then insert into public.plan_grants(user_id,tier,expires_at,granted_by)values(v_target,p_body->>'tier',now()+interval '30 days',auth.uid())on conflict(user_id)do update set tier=excluded.tier,expires_at=excluded.expires_at,granted_by=excluded.granted_by;
  else raise exception 'Invalid grant' using errcode='22023'; end if;
  v_id:=v_target;
 end if;
 v_result:=jsonb_build_object('updated',true,'id',v_id);
 insert into public.admin_audit(actor,action,target,reason,request_id,details)values(auth.uid(),p_action,v_id::text,trim(p_reason),p_request_id,jsonb_build_object('before',v_before,'after',picket_private.admin_snapshot(p_action,v_id)));
 insert into public.admin_mutation_requests(actor,request_id,fingerprint,result)values(auth.uid(),p_request_id,v_fingerprint,v_result);
 return v_result;
end $$;
