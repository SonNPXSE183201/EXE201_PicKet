import subprocess,json,uuid,concurrent.futures
owner=str(uuid.uuid4())
def sql(query):
 r=subprocess.run(['docker','exec','-i','supabase_db_Project','psql','-v','ON_ERROR_STOP=1','-qAt','-U','postgres','-d','postgres'],input=query,text=True,capture_output=True,check=True)
 return r.stdout.strip().splitlines()
lesson='picket.vi.financial.v1.01'
try:
 previous=sql("select published from public.learning_answer_keys where lesson_id='"+lesson+"' and content_version=1;")[-1]
 sql("insert into auth.users(id,email) values ('"+owner+"','concurrency-"+owner+"@example.test'); update public.learning_answer_keys set published=true where lesson_id='"+lesson+"' and content_version=1;")
 def attempt(key):
  query="begin; set local role authenticated; set local request.jwt.claim.sub='"+owner+"'; select public.submit_learning_attempt('"+key+"','"+lesson+"',1,array[1,1,2]); select pg_sleep(0.1); commit;"
  lines=sql(query)
  return next(json.loads(line) for line in lines if line.startswith('{'))
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  results=list(pool.map(attempt,['concurrent_attempt','concurrent_attempt']))
 assert sorted(r['replayed'] for r in results)==[False,True]
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  later=list(pool.map(attempt,['concurrent_attempt_2','concurrent_attempt_3']))
 assert sum(r['awardedXp'] for r in later)==0
 assert sql("select sum(xp) from public.learning_progress where user_id='"+owner+"';")[-1]=='20'
 print('PostgreSQL concurrent retry and distinct request XP tests: PASS')
finally:
 sql("delete from auth.users where id='"+owner+"'; update public.learning_answer_keys set published="+('true' if previous=='t' else 'false')+" where lesson_id='"+lesson+"' and content_version=1;")
 print('Synthetic local user removed; publication gate restored.')
