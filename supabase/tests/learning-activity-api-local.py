"""Disposable local-only learning activity acceptance through the Dart API."""
import concurrent.futures
import json
import secrets
import subprocess
import urllib.error
import urllib.request
import uuid

status=json.loads(subprocess.run(['npx.cmd','--yes','supabase','status','-o','json'],capture_output=True,text=True,check=True).stdout)
base='http://127.0.0.1:54321'
api='http://127.0.0.1:8101'
admin={'apikey':status['SERVICE_ROLE_KEY'],'Authorization':'Bearer '+status['SERVICE_ROLE_KEY']}
owners=[]
lesson='picket.vi.financial.v1.01'

def sql(query):
    result=subprocess.run(['docker','exec','-i','supabase_db_Project','psql','-v','ON_ERROR_STOP=1','-qAt','-U','postgres','-d','postgres'],input=query,text=True,capture_output=True,check=True)
    return result.stdout.strip()

def req(url,method='GET',body=None,headers=None):
    headers=dict(headers or {})
    if body is not None:
        headers['Content-Type']='application/json'
    request=urllib.request.Request(url,method=method,headers=headers,data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(request,timeout=30) as response:
            raw=response.read()
            return response.status,json.loads(raw) if raw else None,dict(response.headers)
    except urllib.error.HTTPError as error:
        return error.code,json.load(error),dict(error.headers)

published=sql("select published from public.learning_answer_keys where lesson_id='"+lesson+"' and content_version=1;")
try:
    tokens=[]
    for _ in range(2):
        email='activity-'+str(uuid.uuid4())+'@example.test'
        password=secrets.token_urlsafe(24)
        code,user,_=req(base+'/auth/v1/admin/users','POST',{'email':email,'password':password,'email_confirm':True},admin)
        assert code==200
        owners.append(user['id'])
        code,session,_=req(base+'/auth/v1/token?grant_type=password','POST',{'email':email,'password':password},{'apikey':status['PUBLISHABLE_KEY']})
        assert code==200
        tokens.append(session['access_token'])
    auth={'Authorization':'Bearer '+tokens[0]}
    other={'Authorization':'Bearer '+tokens[1]}
    sql("update public.learning_answer_keys set published=true where lesson_id='"+lesson+"' and content_version=1;")
    code,result,_=req(api+'/v1/lesson-attempts','POST',{'lessonId':lesson,'contentVersion':1,'answers':[1,1,2]},{**auth,'Idempotency-Key':'activity-fixture-1'})
    assert code==200 and result['awardedXp']==20,('lesson fixture',code)
    sql("update public.learning_progress set completed_at=now()-interval '31 days' where user_id='"+str(uuid.UUID(owners[0]))+"';")
    week=sql("select to_char(date_trunc('week',now() at time zone 'UTC'),'YYYY-MM-DD');")
    review={'kind':'review','lessonId':lesson,'contentVersion':1,'offset':7}
    practice={'kind':'practice','weekStart':week,'skipped':False}
    url=api+'/v1/learning/activity'
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        results=list(pool.map(lambda _:req(url,'PUT',{'events':[review,practice]},auth),range(3)))
    assert all(code==200 for code,_,_ in results),('activity sync', [code for code,_,_ in results])
    assert sql("select sum(xp) from public.learning_activity where owner_id='"+owners[0]+"';")=='10'
    req(url,'PUT',{'events':[{**practice,'skipped':True}]},auth)
    code,activity,headers=req(url,headers=auth)
    assert code==200 and len(activity['reviews'])==1 and activity['practice']==[{'weekStart':week,'skipped':False}]
    assert 'no-store' in headers.get('cache-control',headers.get('Cache-Control',''))
    assert req(url,headers=other)[1]=={'reviews':[],'practice':[]}
    assert req(url,'PUT',{'events':[{**practice,'xp':999}]},auth)[0]==400
    assert req(url)[0]==401
    print('Local activity API/Auth/RLS, concurrent retries, monotonic practice and no extra review XP: PASS')
finally:
    for owner in owners:
        req(base+'/auth/v1/admin/users/'+owner,'DELETE',headers=admin)
    sql("update public.learning_answer_keys set published="+('true' if published=='t' else 'false')+" where lesson_id='"+lesson+"' and content_version=1;")
    print('Disposable activity users removed; draft publication restored.')
