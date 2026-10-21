"""Shared-lock acceptance on a disposable, network-isolated PostgreSQL container."""
import argparse,json,subprocess,re,queue,threading,time
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--container',required=True);args=parser.parse_args()
assert re.fullmatch(r'picket-attempt-[a-f0-9]{8}',args.container)
meta=json.loads(subprocess.check_output(['docker','inspect',args.container],text=True))[0]
assert meta['Config']['Labels'].get('picket.qa')=='transaction-attempt'
assert meta['HostConfig']['NetworkMode']=='none' and all(m['Type']=='tmpfs' for m in meta['Mounts'])
assert '/var/lib/postgresql/data' in meta['HostConfig']['Tmpfs']
base=['docker','exec','-i',args.container,'psql','-U','postgres','-X','-q','-At','-v','ON_ERROR_STOP=1']
def sql(text):return subprocess.run(base,input=text,text=True,capture_output=True,check=True,timeout=30).stdout.strip()
owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';wallet='cccccccc-cccc-4ccc-8ccc-cccccccccccc'
sql("""create role anon;create role authenticated;create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
create table public.transactions(id uuid primary key default gen_random_uuid(),user_id uuid,wallet_id uuid,category_id uuid,title text,amount bigint,kind text,occurred_at timestamptz,note text);
create table public.wallets(id uuid,user_id uuid,archived_at timestamptz);
create table public.categories(id uuid,user_id uuid,kind text,archived_at timestamptz);
create table public.idempotency_keys(user_id uuid,key text,operation text,resource_id uuid,primary key(user_id,key,operation));
grant select,insert on public.transactions,public.idempotency_keys to authenticated;
grant select on public.wallets,public.categories to authenticated;
""")
sql(Path('supabase/migrations/202610210003_transaction_attempt_recovery.sql').read_text())
sql(Path('supabase/migrations/202610210004_transaction_attempt_conflict_code.sql').read_text())
sql(f"insert into auth.users values('{owner}');insert into public.wallets(id,user_id) values('{wallet}','{owner}');")
prefix=f"set request.jwt.claim.sub='{owner}';set role authenticated;"
def create(key):return f"select (public.create_finance_transaction('{key}','{wallet}',null,'QA',1000,'expense',now(),'')).id;"
def resolve(key):return f"select public.resolve_finance_transaction_attempt('{key}')->>'status';"
def start(text):
 p=subprocess.Popen(base,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 p.stdin.write(text+'\n');p.stdin.flush();return p
def marker(p,expected):
 lines=queue.Queue();threading.Thread(target=lambda:lines.put(p.stdout.readline()),daemon=True).start()
 assert lines.get(timeout=15).strip()==expected
def finish(p):
 p.stdin.write('COMMIT;\n');p.stdin.flush();p.stdin.close();assert p.wait(timeout=20)==0,p.stderr.read()
def blocked(name):
 for _ in range(70):
  if sql(f"select count(*) from pg_stat_activity where application_name='{name}' and wait_event='advisory'")=='1':return
  time.sleep(.1)
 raise AssertionError('Contender did not wait on shared PostgreSQL advisory lock')
key='create-wins-0001'
p=start(prefix+'BEGIN;'+create(key)+"select 'READY';")
line=p.stdout.readline().strip();assert re.fullmatch(r'[a-f0-9-]{36}',line);marker(p,'READY')
r=start(prefix+"set application_name='qa_resolve_wait';"+resolve(key));blocked('qa_resolve_wait');finish(p)
r.stdin.close();assert r.wait(timeout=20)==0,r.stderr.read();assert r.stdout.read().strip()=='committed'
key='abandon-wins-0002'
p=start(prefix+'BEGIN;'+resolve(key)+"select 'READY';");marker(p,'abandoned');marker(p,'READY')
r=start(prefix+"set application_name='qa_create_wait';"+create(key));blocked('qa_create_wait');finish(p)
r.stdin.close();assert r.wait(timeout=20)!=0;assert 'TRANSACTION_ATTEMPT_ABANDONED' in r.stderr.read()
assert sql(prefix+resolve(key))=='abandoned'
assert sql(f"select count(*) from public.transactions where user_id='{owner}'")=='1'
print(json.dumps({'realPostgresqlCreateWinsReturnsCommitted':True,'realPostgresqlAbandonWinsFencesWaitingCreate':True,'lostResolutionReplyRetryStable':True,'singleTransaction':True,'networkNoneTmpfsOnly':True}))
