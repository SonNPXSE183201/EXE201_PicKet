import urllib.request,urllib.error,json,subprocess,secrets,uuid
status=json.loads(subprocess.run(['npx.cmd','--yes','supabase','status','-o','json'],capture_output=True,text=True,check=True).stdout)
base='http://127.0.0.1:54321'; api='http://127.0.0.1:8098';created=[]
def req(url,method='GET',body=None,headers=None):
 h=dict(headers or {})
 if body is not None:h['Content-Type']='application/json'
 request=urllib.request.Request(url,data=None if body is None else json.dumps(body).encode(),headers=h,method=method)
 try:
  with urllib.request.urlopen(request,timeout=25) as r:return r.status,json.load(r),dict(r.headers)
 except urllib.error.HTTPError as e:return e.code,json.load(e),dict(e.headers)
def sql(query):
 return subprocess.run(['docker','exec','-i','supabase_db_Project','psql','-v','ON_ERROR_STOP=1','-qAt','-U','postgres','-d','postgres'],input=query,text=True,capture_output=True,check=True).stdout.strip()
admin={'apikey':status['SERVICE_ROLE_KEY'],'Authorization':'Bearer '+status['SERVICE_ROLE_KEY']}
previous=sql("select published from public.learning_answer_keys where lesson_id='picket.vi.financial.v1.01' and content_version=1;")
try:
 tokens=[]
 for _ in range(2):
  email='learning-api-'+str(uuid.uuid4())+'@example.test';password=secrets.token_urlsafe(24)
  code,user,_=req(base+'/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True},admin)
  assert code==200,('admin_create',code)
  created.append(user['id'])
  code,session,_=req(base+'/auth/v1/token?grant_type=password','POST',{'email':email,'password':password},{'apikey':status['PUBLISHABLE_KEY']})
  assert code==200,('login',code);tokens.append(session['access_token'])
 h={'Authorization':'Bearer '+tokens[0],'Idempotency-Key':'live_attempt_1'}
 body={'lessonId':'picket.vi.financial.v1.01','contentVersion':1,'answers':[1,1,2]}
 code,_,_=req(api+'/v1/lesson-attempts','POST',body,h)
 assert code==400,('draft_gate',code)
 sql("update public.learning_answer_keys set published=true where lesson_id='picket.vi.financial.v1.01' and content_version=1;")
 code,result,_=req(api+'/v1/lesson-attempts','POST',body,h)
 assert code==200 and result=={'correct':3,'total':3,'awardedXp':20,'replayed':False},('submit',code)
 code,result,_=req(api+'/v1/lesson-attempts','POST',body,h)
 assert code==200 and result['replayed'] is True,('retry',code)
 code,_,_=req(api+'/v1/lesson-attempts','POST',{**body,'answers':[0,0,0]},h)
 assert code==409,('conflict',code)
 code,progress,headers=req(api+'/v1/learning-progress',headers={'Authorization':'Bearer '+tokens[0]})
 assert code==200 and len(progress['progress'])==1 and progress['progress'][0]['xp']==20,('progress',code)
 assert 'no-store' in headers.get('cache-control',headers.get('Cache-Control',''))
 code,other,_=req(api+'/v1/learning-progress',headers={'Authorization':'Bearer '+tokens[1]})
 assert code==200 and other['progress']==[],('owner_isolation',code)
 assert req(api+'/v1/learning-progress')[0]==401
 print('Live local Dart API + Supabase auth/RLS learning integration: PASS')
finally:
 for owner in created:req(base+'/auth/v1/admin/users/'+owner,'DELETE',headers=admin)
 sql("update public.learning_answer_keys set published="+('true' if previous=='t' else 'false')+" where lesson_id='picket.vi.financial.v1.01' and content_version=1;")
 print('Disposable local users cleaned up; original publication gate restored.')
