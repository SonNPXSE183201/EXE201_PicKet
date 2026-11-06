"""Local Dart API/Auth/RLS/worker acceptance; never reads production secrets."""
import concurrent.futures
import json
import os
import secrets
import shutil
import subprocess
import urllib.error
import urllib.request
import uuid

status = json.loads(subprocess.run(['npx.cmd', '--yes', 'supabase', 'status', '-o', 'json'], capture_output=True, text=True, check=True).stdout)
base = 'http://127.0.0.1:54321'
api = 'http://127.0.0.1:8101'
created = []
admin = {'apikey': status['SERVICE_ROLE_KEY'], 'Authorization': 'Bearer ' + status['SERVICE_ROLE_KEY']}

def req(url, method='GET', body=None, headers=None):
    headers = dict(headers or {})
    if body is not None:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(url, method=method, headers=headers, data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else None, dict(response.headers)
    except urllib.error.HTTPError as error:
        raw = error.read()
        return error.code, json.loads(raw) if raw else None, dict(error.headers)

def rpc(name, body):
    code, result, _ = req(base+'/rest/v1/rpc/'+name, 'POST', body, admin)
    assert code == 200, ('worker RPC', name, code)
    return result

try:
    tokens = []
    for _ in range(2):
        email = 'learning-ai-' + str(uuid.uuid4()) + '@example.test'
        password = secrets.token_urlsafe(24)
        code, user, _ = req(base+'/auth/v1/admin/users', 'POST', {'email':email,'password':password,'email_confirm':True}, admin)
        assert code == 200
        created.append(user['id'])
        code, session, _ = req(base+'/auth/v1/token?grant_type=password', 'POST', {'email':email,'password':password}, {'apikey':status['PUBLISHABLE_KEY']})
        assert code == 200
        tokens.append(session['access_token'])
    auth = {'Authorization':'Bearer '+tokens[0]}
    other = {'Authorization':'Bearer '+tokens[1]}
    consent = api+'/v1/learning-ai/consent'
    jobs = api+'/v1/learning-ai/jobs'
    case = {'scenarioId':'cash-gap-v1','locale':'vi'}
    assert req(consent, headers=auth)[1]['accepted'] is False
    assert req(jobs, 'POST', case, {**auth,'Idempotency-Key':'local_case_1'})[0] == 403
    assert req(consent, 'PUT', {'accepted':True}, auth)[0] == 200
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results=list(pool.map(lambda _:req(jobs,'POST',case,{**auth,'Idempotency-Key':'local_case_1'}),range(2)))
    assert all(code==202 for code,_,_ in results), 'retry acceptance'
    job=results[0][1]['id']
    assert results[1][1]['id']==job, 'duplicate provider work'
    assert req(jobs,'POST',{**case,'locale':'en'},{**auth,'Idempotency-Key':'local_case_1'})[0]==409
    assert req(jobs,'POST',{**case,'text':'personal question'},{**auth,'Idempotency-Key':'local_invalid'})[0]==400
    assert req(jobs+'/'+job,headers=other)[0]==404
    assert req(base+'/rest/v1/rpc/claim_learning_ai_job','POST',{}, {'apikey':status['PUBLISHABLE_KEY'],**auth})[0] in (401,403)
    env={**os.environ,'APP_ENV':'test','LEARNING_AI_ENABLED':'true','SUPABASE_URL':base,'SUPABASE_SECRET_KEY':status['SERVICE_ROLE_KEY'],'GEMINI_API_KEY':'local-synthetic-key','GEMINI_MODEL':'gemini-test'}
    worker=subprocess.run([shutil.which('dart'),'run','tool/learning_ai_local_worker.dart'],cwd='apps/api',env=env,capture_output=True,text=True)
    assert worker.returncode==0, 'local worker acceptance failed (inspect sanitized harness)'
    code, result, headers=req(jobs+'/'+job,headers=auth)
    assert code==200 and result['status']=='completed' and result['statementIds']==['timing','buffer']
    assert 'no-store' in headers.get('cache-control',headers.get('Cache-Control',''))
    req(jobs,'POST',case,{**auth,'Idempotency-Key':'local_case_2'})
    claimed=rpc('claim_learning_ai_job',{})
    lease={'p_id':claimed['id'],'p_lease_token':claimed['leaseToken']}
    assert rpc('dispatch_learning_ai_job',lease)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        finish=pool.submit(rpc,'finish_learning_ai_job',{**lease,'p_statement_ids':['timing']})
        revoke=pool.submit(req,consent,'PUT',{'accepted':False},auth)
        finish.result();assert revoke.result()[0]==200
    assert req(jobs+'/'+claimed['id'],headers=auth)[1]['statementIds']==[], 'revoke resurrection'
    req(consent,'PUT',{'accepted':True},auth)
    _, third, _=req(jobs,'POST',case,{**auth,'Idempotency-Key':'local_case_3'})
    claimed=rpc('claim_learning_ai_job',{})
    lease={'p_id':claimed['id'],'p_lease_token':claimed['leaseToken']}
    rpc('dispatch_learning_ai_job',lease)
    assert req(jobs,'DELETE',headers=auth)[0]==204
    assert not rpc('finish_learning_ai_job',{**lease,'p_statement_ids':['buffer']})
    assert req(jobs+'/'+third['id'],headers=auth)[0]==404
    assert req(jobs,'POST',case,{**auth,'Idempotency-Key':'local_case_4'})[0]==429
    req(consent,'PUT',{'accepted':True},other)
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        codes=list(pool.map(lambda i:req(jobs,'POST',case,{**other,'Idempotency-Key':'concurrent_'+str(i)})[0],range(10)))
    assert codes.count(202)==3 and codes.count(429)==7, ('atomic owner quota',codes)
    print('Local AI API + real Auth/RLS + Dart worker, deduplication, revoke race, deletion and concurrent quota: PASS')
finally:
    # Remove only this run's usage increments before cascading its disposable users.
    if created:
        owners=','.join("'"+str(uuid.UUID(owner))+"'" for owner in created)
        sql="update public.learning_ai_daily_usage u set requests=greatest(0,requests-(select count(*) from public.learning_ai_jobs j where j.owner_id in ("+owners+") and (j.created_at at time zone 'UTC')::date=u.usage_day));"
        subprocess.run(['docker','exec','-i','supabase_db_Project','psql','-v','ON_ERROR_STOP=1','-qAt','-U','postgres','-d','postgres'],input=sql,text=True,capture_output=True,check=True)
        for owner in created:
            req(base+'/auth/v1/admin/users/'+owner,'DELETE',headers=admin)
    print('Disposable local AI users removed.')
