-- Audit authorized user-directory reads without copying the search/email.
create function picket_private.admin_log_lookup(p_section text,p_filters jsonb)returns void
language plpgsql security definer set search_path=''as $$begin
 perform picket_private.admin_require(case when p_section in('users','user')then'users'else'staff'end);
 insert into public.admin_audit(actor,action,target,reason,details)
 values(auth.uid(),case when p_section='staff'then'view_staff'else'view_users'end,
 coalesce(p_filters->>'userId','directory'),'Administrative lookup',
 jsonb_build_object('searchApplied',coalesce(p_filters->>'search','')<>'','page',coalesce((p_filters->>'page')::integer,0)));
end $$;
revoke all on function picket_private.admin_log_lookup(text,jsonb)from public,anon,authenticated;
grant execute on function picket_private.admin_log_lookup(text,jsonb)to authenticated;
create or replace function public.admin_portal(p_section text,p_filters jsonb default '{}'::jsonb)returns jsonb
language plpgsql security invoker set search_path=''as $$
declare result jsonb;begin
 result:=picket_private.admin_portal(p_section,p_filters);
 if p_section in('users','user','staff')then perform picket_private.admin_log_lookup(p_section,p_filters);end if;
 return result;
end $$;
notify pgrst,'reload schema';
