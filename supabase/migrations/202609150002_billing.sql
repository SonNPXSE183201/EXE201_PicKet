create table public.play_purchases (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  tier text not null check(tier in ('plus','pro')),
  expires_at timestamptz not null,
  active boolean not null,
  superseded_by text,
  verified_at timestamptz not null default now()
);
alter table public.play_purchases enable row level security;
revoke all on public.play_purchases from anon, authenticated;
grant select(user_id,product_id,tier,expires_at,active,verified_at) on public.play_purchases to authenticated;
create policy purchase_owner_read on public.play_purchases for select to authenticated using(user_id=(select auth.uid()));
create function public.current_plan() returns text language sql stable security definer set search_path='' as $$
select coalesce((select tier from public.play_purchases where user_id=auth.uid() and active and expires_at>now() and verified_at>now()-interval '24 hours' order by case tier when 'pro' then 2 else 1 end desc limit 1),'free');
$$;
revoke all on function public.current_plan() from public;
grant execute on function public.current_plan() to authenticated;
-- Service-only write: purchase tokens must never be trusted from the app.
create function public.record_play_purchase(p_hash text,p_user uuid,p_product text,p_tier text,p_expires timestamptz,p_active boolean,p_previous_hash text default null) returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.play_purchases(token_hash,user_id,product_id,tier,expires_at,active) values(p_hash,p_user,p_product,p_tier,p_expires,p_active)
  on conflict(token_hash) do update set product_id=excluded.product_id,tier=excluded.tier,expires_at=excluded.expires_at,active=excluded.active and play_purchases.superseded_by is null,verified_at=now() where play_purchases.user_id=excluded.user_id;
  if not found then raise exception 'Purchase belongs to another account'; end if;
  if p_active and p_previous_hash is not null and p_previous_hash<>p_hash then
    update public.play_purchases set active=false,superseded_by=p_hash where token_hash=p_previous_hash and user_id=p_user;
  end if;
end $$;
revoke all on function public.record_play_purchase(text,uuid,text,text,timestamptz,boolean,text) from public,anon,authenticated;
grant execute on function public.record_play_purchase(text,uuid,text,text,timestamptz,boolean,text) to service_role;
grant all on public.play_purchases to service_role;

