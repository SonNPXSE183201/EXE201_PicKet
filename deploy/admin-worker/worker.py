"""Low-memory scheduled admin ingestion. Does not send user email or payments."""
import datetime as dt
import glob
import hashlib
import json
import os
from pathlib import Path
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
import socket
import ssl
from metrics import apk_log_metric, parse_play_installs, parse_sales_orders, parse_sales_zip, newest_database_backup

STATE = Path(os.getenv('ADMIN_WORKER_STATE', '/state/state.json'))


def call_rpc(name, body):
    base = os.environ['SUPABASE_URL'].rstrip('/')
    if not base.startswith('https://'):
        raise ValueError('HTTPS required')
    secret = os.environ['SUPABASE_SECRET_KEY']
    headers = {'apikey': secret, 'content-type': 'application/json'}
    if not secret.startswith('sb_secret_'):
        headers['authorization'] = f'Bearer {secret}'
    request = urllib.request.Request(f'{base}/rest/v1/rpc/{name}', json.dumps(body).encode(), headers, method='POST')
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read(2_000_000)


def ingest(source, rows, **meta):
    call_rpc('admin_ingest', {'p_source': source, 'p_meta': {'status': 'ok', **meta}, 'p_rows': rows})


def source_failure(source, message, status='error'):
    # Do not persist exception text: provider errors can contain credential URLs.
    ingest(source, [], status=status, message=message)


def health():
    config = json.loads(call_rpc('admin_worker_config', {}))
    timeout = config.get('probeTimeoutSeconds', 8)
    samples = []
    for component, url in [('api', 'http://api:8080/health'), ('web', 'http://web:3000/login'), ('landing', 'https://picketfinance.com/release.json'), ('ocr', 'http://ocr-provider:8000/health')]:
        start = time.monotonic()
        try:
            with urllib.request.urlopen(url, timeout=timeout) as response:
                ok = response.status == 200
            samples.append({'component': component, 'status': 'ok' if ok else 'down', 'latencyMs': min(120000, round((time.monotonic()-start)*1000)), 'message': 'HTTP probe'})
        except Exception:
            samples.append({'component': component, 'status': 'down', 'message': 'Probe failed or timed out'})
    try:
        call_rpc('admin_worker_ping', {})
        samples.append({'component': 'database', 'status': 'ok', 'message': 'Authenticated database probe'})
    except Exception:
        samples.append({'component': 'database', 'status': 'down', 'message': 'Database probe failed'})
    usage = shutil.disk_usage(STATE.parent)
    samples.append({'component': 'disk', 'status': 'degraded' if usage.used/usage.total > config.get('diskWarningPercent', 85)/100 else 'ok', 'message': f'Data filesystem used {round(100*usage.used/usage.total)}%'})
    try:
        used = int(Path('/sys/fs/cgroup/memory.current').read_text())
        limit = int(Path('/sys/fs/cgroup/memory.max').read_text())
        samples.append({'component': 'worker_memory', 'status': 'degraded' if used/limit > .9 else 'ok', 'message': f'Worker container memory used {round(100*used/limit)}%'})
    except (OSError, ValueError):
        samples.append({'component': 'worker_memory', 'status': 'unknown', 'message': 'Cgroup memory source unavailable'})
    backup_dir = Path('/backups')
    newest = newest_database_backup(backup_dir)
    if newest is not None:
        samples.append({'component': 'backup', 'status': 'ok' if time.time()-newest < 172800 else 'degraded', 'message': 'File freshness only; restore acceptance is separate'})
    else:
        samples.append({'component': 'backup', 'status': 'unknown', 'message': 'Backup metadata source not configured'})
    try:
        base = os.environ['SUPABASE_URL'].rstrip('/')
        secret = os.environ['SUPABASE_SECRET_KEY']
        headers = {'apikey': secret}
        if not secret.startswith('sb_secret_'):
            headers['authorization'] = f'Bearer {secret}'
        with urllib.request.urlopen(urllib.request.Request(base+'/storage/v1/bucket', headers=headers), timeout=8) as response:
            storage_ok = response.status == 200
        samples.append({'component': 'storage', 'status': 'ok' if storage_ok else 'down', 'message': 'Authenticated bucket metadata read; upload round-trip acceptance is separate'})
    except Exception:
        samples.append({'component': 'storage', 'status': 'down', 'message': 'Storage metadata probe failed'})
    if os.getenv('ADMIN_SMTP_PROBE') == 'true':
        try:
            # TLS handshake only: no credentials and no email delivery.
            with socket.create_connection(('smtp.gmail.com', 465), timeout=8) as connection:
                with ssl.create_default_context().wrap_socket(connection, server_hostname='smtp.gmail.com') as secure:
                    smtp_ok = secure.recv(100).startswith(b'220')
            samples.append({'component': 'smtp_transport', 'status': 'ok' if smtp_ok else 'down', 'message': 'TLS transport only; not a mail-delivery test'})
        except Exception:
            samples.append({'component': 'smtp_transport', 'status': 'down', 'message': 'SMTP TLS handshake failed'})
    else:
        samples.append({'component': 'smtp_transport', 'status': 'unknown', 'message': 'SMTP transport probe not enabled'})
    ingest('health', samples)


def play_reports(state):
    bucket = os.getenv('PLAY_REPORTS_BUCKET', '')
    if not bucket:
        source_failure('google_play_installs', 'Reports bucket not configured', 'not_configured')
        return
    if not bucket.startswith('pubsite_prod_rev_') or '/' in bucket:
        raise ValueError('Invalid reports bucket')
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/devstorage.read_only'])
    session = AuthorizedSession(credentials)
    today = dt.datetime.now(dt.timezone.utc).date()
    months = [today.replace(day=1), (today.replace(day=1)-dt.timedelta(days=1)).replace(day=1)]
    found = False
    for month in months:
        key = f'stats/installs/installs_com.picket.mobile_{month:%Y%m}_country.csv'
        url = f'https://storage.googleapis.com/storage/v1/b/{bucket}/o/{urllib.parse.quote(key, safe="")}'
        response = session.get(url, params={'alt': 'media'}, timeout=30)
        if response.status_code == 404:
            continue
        response.raise_for_status()
        found = True
        payload = response.content
        checksum = hashlib.sha256(payload).hexdigest()
        if state.get(key) == checksum:
            ingest('google_play_installs', [], checkpoint=checksum, message='Report checked; unchanged data preserved')
            continue
        rows = parse_play_installs(payload, month.isoformat())
        ingest('google_play_installs', rows, month=month.isoformat(), checkpoint=checksum, message='Country report; source metric names preserved')
        state[key] = checksum
    if not found:
        source_failure('google_play_installs', 'No monthly reports available yet', 'not_configured')


def play_vitals(state):
    if os.getenv('PLAY_VITALS_ENABLED') != 'true':
        source_failure('google_play_vitals', 'Reporting API not configured', 'not_configured')
        return
    if time.time()-state.get('vitalsLastAttempt', 0) < 21600:
        return
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/playdeveloperreporting'])
    session = AuthorizedSession(credentials)
    result = []
    for resource, metric in [('crashRateMetricSet', 'userPerceivedCrashRate'), ('anrRateMetricSet', 'userPerceivedAnrRate')]:
        base = f'https://playdeveloperreporting.googleapis.com/v1beta1/apps/com.picket.mobile/{resource}'
        metadata = session.get(base, timeout=25)
        metadata.raise_for_status()
        freshness = next((f for f in metadata.json().get('freshnessInfo', {}).get('freshnesses', []) if f.get('aggregationPeriod') == 'DAILY'), None)
        if not freshness:
            continue
        end_value = freshness['latestEndTime']
        end = dt.date(end_value['year'], end_value['month'], end_value['day'])
        start = end-dt.timedelta(days=30)
        date = lambda d: {'year': d.year, 'month': d.month, 'day': d.day, 'timeZone': {'id': 'America/Los_Angeles'}}
        body = {'timelineSpec': {'aggregationPeriod': 'DAILY', 'startTime': date(start), 'endTime': date(end)}, 'metrics': [metric], 'pageSize': 1000}
        response = session.post(base+':query', json=body, timeout=25)
        response.raise_for_status()
        for row in response.json().get('rows', []):
            stamp = row['startTime']
            day = dt.date(stamp['year'], stamp['month'], stamp['day'])
            for item in row.get('metrics', []):
                value = float(item.get('decimalValue', {}).get('value', 'nan'))
                if not 0 <= value <= 100:
                    raise ValueError('Invalid vitals value')
                result.append({'day': day.isoformat(), 'metric': item['metric'], 'value': value, 'timezone': 'America/Los_Angeles'})
    ingest('google_play_vitals', result, message='Source rates as reported; empty rows mean insufficient data, not zero crashes')
    state['vitalsLastAttempt'] = time.time()


def play_financial(state):
    if os.getenv('PLAY_FINANCIAL_ENABLED') != 'true' or not os.getenv('PLAY_REPORTS_BUCKET'):
        source_failure('google_play_financial', 'Financial report access not configured', 'not_configured')
        return
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/devstorage.read_only'])
    session = AuthorizedSession(credentials)
    month = dt.datetime.now(dt.timezone.utc).date().replace(day=1)
    for month in (month, (month-dt.timedelta(days=1)).replace(day=1)):
        key = f'sales/salesreport_{month:%Y%m}.zip'
        url = f'https://storage.googleapis.com/storage/v1/b/{os.environ["PLAY_REPORTS_BUCKET"]}/o/{urllib.parse.quote(key, safe="")}'
        response = session.get(url, params={'alt': 'media'}, timeout=30)
        if response.status_code == 404:
            continue
        response.raise_for_status()
        checksum = hashlib.sha256(response.content).hexdigest()
        if state.get(key) != checksum:
            rows = parse_sales_zip(response.content, month.isoformat())
            orders = parse_sales_orders(response.content, month.isoformat())
            ingest('google_play_financial', rows, month=month.isoformat(), checkpoint=checksum, message='Estimated charged/refunded amounts by original currency; not payout or accounting totals')
            if orders:
                # Confirms estimated ledger rows by Order Number; idempotent per order.
                call_rpc('revenue_ingest_play_report', {'p_rows': orders, 'p_report': f'{key}#{checksum[:16]}'})
            state[key] = checksum


def apk_logs(state):
    files = sorted(glob.glob('/logs/landing*.json') + glob.glob('/logs/landing*.log'))
    if not files:
        source_failure('apk_access', 'No sanitized access logs found', 'not_configured')
        return
    offsets = state.setdefault('logOffsets', {})
    counts = state.setdefault('downloadCounts', {})
    for name in files:
        stat = os.stat(name)
        identity = str(stat.st_ino)
        offset = int(offsets.get(identity, 0))
        if stat.st_size < offset:
            offset = 0
        with open(name, 'rb') as stream:
            stream.seek(offset)
            for _ in range(100000):
                raw = stream.readline(100000)
                if not raw:
                    break
                if not raw.endswith(b'\n'):
                    stream.seek(-len(raw), 1)
                    break
                try:
                    item = apk_log_metric(json.loads(raw))
                except (ValueError, TypeError, OverflowError):
                    item = None
                if item:
                    key = item['day'] + '|' + item['dimension']
                    counts[key] = counts.get(key, 0) + 1
            offsets[identity] = stream.tell()
    rows = [{'day': key.split('|')[0], 'dimension': key.split('|')[1], 'metric': 'served_requests', 'value': count, 'timezone': 'UTC'} for key, count in counts.items()]
    ingest('apk_access', rows, message='Successful GET 200/206 requests; not unique people or completed installs')


def cycle():
    STATE.parent.mkdir(parents=True, exist_ok=True)
    try:
        state = json.loads(STATE.read_text())
    except (FileNotFoundError, ValueError):
        state = {}
    health()
    try:
        release_readback()
    except Exception:
        source_failure('release_readback', 'Release readback unavailable; registry unchanged')
    for source, run in [('google_play_installs', play_reports), ('apk_access', apk_logs), ('google_play_vitals', play_vitals), ('google_play_financial', play_financial)]:
        try:
            run(state)
        except Exception:
            source_failure(source, 'Import failed; previous successful data preserved')
    call_rpc('admin_retention_cleanup', {})
    for _ in range(5):
        if call_rpc('admin_process_export', {}).strip() == b'null':
            break
    temporary = STATE.with_suffix('.tmp')
    temporary.write_text(json.dumps(state))
    os.replace(temporary, STATE)


PLAY_TRACKS = {'internal': 'play_internal', 'alpha': 'play_alpha', 'beta': 'play_beta', 'production': 'play_production'}


def play_track_rows(tracks):
    """Map Publisher API tracks to registry rows. Unknown/custom tracks are ignored."""
    rows = []
    for track in tracks:
        channel = PLAY_TRACKS.get(track.get('track'))
        if not channel:
            continue
        for release in track.get('releases', []):
            for code in release.get('versionCodes', []):
                if str(code).isdigit():
                    rows.append({'channel': channel, 'versionCode': int(code), 'status': release.get('status'),
                                 'name': release.get('name'), 'userFraction': release.get('userFraction')})
    return rows


def release_readback():
    """Read-only checks: the public landing manifest and (opt-in) Play tracks.

    Play is read through a temporary edit that is always deleted and never
    committed, so closed testing and every other track stay untouched.
    """
    request = urllib.request.Request('https://picketfinance.com/release.json', headers={'Accept': 'application/json', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=15) as response:
        manifest = json.loads(response.read(65536))
    call_rpc('release_readback', {'p_source': 'landing_probe', 'p_rows': [{
        'versionCode': manifest.get('versionCode'), 'sha256': manifest.get('sha256'), 'bytes': manifest.get('bytes')}]})
    if os.getenv('PLAY_TRACK_READBACK') != 'true':
        return
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/androidpublisher'])
    session = AuthorizedSession(credentials)
    base = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.picket.mobile/edits'
    edit = session.post(base, json={}, timeout=30)
    edit.raise_for_status()
    edit_id = edit.json()['id']
    try:
        tracks = session.get(f'{base}/{edit_id}/tracks', timeout=30)
        tracks.raise_for_status()
        rows = play_track_rows(tracks.json().get('tracks', []))
    finally:
        session.delete(f'{base}/{edit_id}', timeout=30)
    call_rpc('release_readback', {'p_source': 'play_api', 'p_rows': rows})


def reconcile_payos():
    secret = os.environ['PAYOS_WORKER_SECRET']
    if len(secret) < 32:
        raise ValueError('Worker secret required')
    request = urllib.request.Request(
        'http://api:8080/v1/billing/payos/reconcile', b'{}',
        {'authorization': f'Bearer {secret}', 'content-type': 'application/json'}, method='POST')
    with urllib.request.urlopen(request, timeout=660) as response:
        return json.loads(response.read(4096))


def payos_tick():
    """PayOS links live 15 minutes; overdue ones are re-read about every minute."""
    if os.getenv('PAYOS_ENABLED') != 'true':
        return
    try:
        reconcile_payos()
    except Exception:
        print('PayOS reconciliation unavailable; durable orders will be retried', flush=True)


if __name__ == '__main__':
    interval = max(60, int(os.getenv('ADMIN_WORKER_INTERVAL', '300')))
    payos_interval = max(30, int(os.getenv('PAYOS_RECONCILE_INTERVAL', '60')))
    next_cycle = 0.0
    while True:
        payos_tick()
        if time.monotonic() >= next_cycle:
            try:
                cycle()
                print('Admin ingestion cycle completed', flush=True)
            except Exception:
                print('Admin ingestion unavailable; retrying without exposing upstream details', flush=True)
            next_cycle = time.monotonic() + interval
        time.sleep(payos_interval)
