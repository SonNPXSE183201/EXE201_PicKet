"""Local-only API/auth/RLS/concurrency acceptance using disposable users."""
import concurrent.futures
import json
import os
import re
import secrets
import subprocess
import urllib.error
import urllib.request
import uuid

status = json.loads(subprocess.run(['npx.cmd', '--yes', 'supabase', 'status', '-o', 'json'], capture_output=True, text=True, check=True).stdout)
base = 'http://127.0.0.1:54321'
api = os.environ.get('PICKET_LOCAL_API_URL', 'http://127.0.0.1:8103')
assert re.fullmatch(r'http://127\.0\.0\.1:[0-9]{4,5}', api), 'Local API only'
created = []

def req(url, method='GET', body=None, headers=None):
    headers = dict(headers or {})
    if body is not None:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(url, method=method, headers=headers, data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.load(response), dict(response.headers)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error), dict(error.headers)

admin = {'apikey': status['SERVICE_ROLE_KEY'], 'Authorization': 'Bearer ' + status['SERVICE_ROLE_KEY']}
try:
    tokens = []
    for _ in range(2):
        email = 'cashflow-api-' + str(uuid.uuid4()) + '@example.test'
        password = secrets.token_urlsafe(24)
        code, user, _ = req(base + '/auth/v1/admin/users', 'POST', {'email': email, 'password': password, 'email_confirm': True}, admin)
        assert code == 200, ('create', code)
        created.append(user['id'])
        code, session, _ = req(base + '/auth/v1/token?grant_type=password', 'POST', {'email': email, 'password': password}, {'apikey': status['PUBLISHABLE_KEY']})
        assert code == 200, ('login', code)
        tokens.append(session['access_token'])
    auth = {'Authorization': 'Bearer ' + tokens[0]}
    code, ledger, ledger_headers = req(api + '/v1/cashflow-ledger', headers=auth)
    assert code == 200 and ledger['wallets'] == [] and ledger['entries'] == [] and ledger['confirmations'] == [], ('empty ledger snapshot', code)
    assert 'no-store' in ledger_headers.get('cache-control', ledger_headers.get('Cache-Control', ''))
    code, account, _ = req(api + '/v1/accounts', 'POST', {'name':'Snapshot wallet','kind':'cash','currencyCode':'VND','openingBalance':100000}, {**auth,'Idempotency-Key':'ledger-account-fixture'})
    assert code == 201, ('ledger account', code)
    code, ledger, _ = req(api + '/v1/cashflow-ledger', headers=auth)
    assert code == 200 and len(ledger['wallets']) == 1 and ledger['wallets'][0]['openingBalance'] == 100000
    assert req(api + '/v1/cashflow-ledger', headers={'Authorization':'Bearer '+tokens[1]})[1]['wallets'] == []
    assert req(api + '/v1/cashflow-ledger')[0] == 401
    item = {'id': str(uuid.uuid4()), 'startDay': '2026-10-24', 'frequency': 'monthly', 'amount': -19000, 'currency': 'VND', 'active': True, 'walletId':ledger['wallets'][0]['id']}
    url = api + '/v1/cashflow-schedules/' + item['id']
    body = {'expectedRevision': 0, 'schedule': item}
    code, empty, headers = req(api + '/v1/cashflow-schedules', headers=auth)
    assert code == 200 and empty['revision'] == 0 and empty['schedules'] == [], ('initial', code)
    assert 'no-store' in headers.get('cache-control', headers.get('Cache-Control', ''))
    write = {**auth, 'Idempotency-Key': 'concurrent-schedule-1'}
    foreign_auth = {'Authorization':'Bearer '+tokens[1]}
    code, _, _ = req(api + '/v1/accounts', 'POST', {'name':'Foreign scope wallet','kind':'cash','currencyCode':'VND','openingBalance':0}, {**foreign_auth,'Idempotency-Key':'foreign-wallet-fixture'})
    assert code == 201
    foreign_wallet = req(api + '/v1/cashflow-ledger', headers=foreign_auth)[1]['wallets'][0]['id']
    assert req(url, 'PUT', {**body,'schedule':{**item,'walletId':foreign_wallet}}, {**auth,'Idempotency-Key':'foreign-scope-reject'})[0] == 400, 'foreign wallet scope accepted'
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: req(url, 'PUT', body, write), range(2)))
    assert all(code == 200 and result['revision'] == 1 and len(result['schedules']) == 1 for code, result, _ in responses), 'concurrent retry'
    assert all(result['schedules'][0]['walletId'] == item['walletId'] for _, result, _ in responses), 'wallet scope lost'
    assert req(url, 'PUT', {**body, 'schedule': {**item, 'amount': -49000}}, write)[0] == 409
    assert req(url, 'PUT', body, {**auth, 'Idempotency-Key': 'stale-schedule-1'})[0] == 409
    code, other, _ = req(api + '/v1/cashflow-schedules', headers={'Authorization': 'Bearer ' + tokens[1]})
    assert code == 200 and other['schedules'] == [] and other['revision'] == 0, 'owner isolation'
    assert req(url, 'DELETE', {'expectedRevision': 0}, {'Authorization': 'Bearer ' + tokens[1], 'Idempotency-Key': 'other-delete-1'})[0] == 400
    code, removed, _ = req(url, 'DELETE', {'expectedRevision': 1}, {**auth, 'Idempotency-Key': 'delete-schedule-1'})
    assert code == 200 and removed['revision'] == 2 and removed['schedules'] == [], ('remove', code)
    code, replay, _ = req(url, 'PUT', body, write)
    assert code == 200 and replay['revision'] == 2 and replay['appliedRevision'] == 1 and replay['schedules'] == [], 'old retry resurrected deleted schedule'
    assert req(url, 'PUT', {'expectedRevision': 2, 'schedule': {**item, 'startDay': '2026-02-30'}}, {**auth, 'Idempotency-Key': 'invalid-date-1'})[0] == 400
    assert req(api + '/v1/cashflow-schedules')[0] == 401
    print('Local Dart API + Supabase ledger snapshot, schedule CRUD, concurrent retry, conflict, owner isolation and no-store: PASS')
finally:
    for owner in created:
        req(base + '/auth/v1/admin/users/' + owner, 'DELETE', headers=admin)
    print('Disposable local schedule users removed.')
