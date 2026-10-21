"""Real PostgreSQL lock acceptance, restricted to an isolated labelled QA container.

Container must have label picket.qa=ocr-retention, network=none, no bind mounts.
No production DSN or credentials are accepted. Container lifecycle is external.
"""
import argparse
import json
from pathlib import Path
import queue
import re
import subprocess
import threading
import time

parser = argparse.ArgumentParser()
parser.add_argument('--container', required=True)
args = parser.parse_args()
assert re.fullmatch(r'picket-ocr-retention-[a-f0-9]{8}', args.container)
metadata = json.loads(subprocess.check_output(['docker', 'inspect', args.container], text=True))[0]
assert metadata['Config']['Labels'].get('picket.qa') == 'ocr-retention'
assert metadata['HostConfig']['NetworkMode'] == 'none'
assert all(mount['Type'] == 'tmpfs' for mount in metadata['Mounts']), 'No bind mounts or persistent volumes are allowed'
# Docker 29 exposes --tmpfs in HostConfig.Tmpfs, not necessarily Mounts.
ephemeral = metadata['HostConfig'].get('Tmpfs') or {}
assert '/var/lib/postgresql/data' in ephemeral, 'PostgreSQL data must be an explicit tmpfs mount'
database = 'picket_ocr_retention_qa'
base = ['docker', 'exec', '-i', args.container, 'psql', '-U', 'postgres', '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1']

def sql(statement, db=database):
    return subprocess.run([*base, '-d', db], input=statement, text=True,
                          capture_output=True, check=True, timeout=30).stdout.strip()

sql('CREATE DATABASE '+database+';', 'postgres')
sql('''CREATE ROLE service_role;
CREATE TABLE public.ocr_fallback_jobs(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  storage_path text NOT NULL, status text NOT NULL DEFAULT 'queued', result jsonb,
  expires_at timestamptz NOT NULL DEFAULT now()-interval '1 hour',
  updated_at timestamptz DEFAULT now(), worker_id text, lease_expires_at timestamptz,
  storage_deleted_at timestamptz);
CREATE TABLE public.receipts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, storage_path text NOT NULL, archived_at timestamptz);
''')
sql((Path(__file__).resolve().parents[1] / 'migrations/202610210001_ocr_receipt_image_retention.sql').read_text(encoding='utf-8'))
owner = '99999999-9999-4999-8999-999999999999'

def start(statement):
    process = subprocess.Popen([*base, '-d', database], stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
    process.stdin.write(statement+'\n'); process.stdin.flush()
    return process

def marker(process, expected):
    lines = queue.Queue()
    threading.Thread(target=lambda: lines.put(process.stdout.readline()), daemon=True).start()
    assert lines.get(timeout=15).strip() == expected

def finish(process, statement='COMMIT;'):
    process.stdin.write(statement+'\n'); process.stdin.flush(); process.stdin.close()
    assert process.wait(timeout=20) == 0, process.stderr.read()

def wait_blocked(name):
    for _ in range(60):
        if sql("select count(*) from pg_stat_activity where application_name='"+name+"' and wait_event='advisory';") == '1':
            return
        time.sleep(.1)
    raise AssertionError('Second PostgreSQL connection did not wait on the shared path lock')

results = []
try:
    path = owner+'/ocr/receipt-wins.jpg'
    sql("insert into public.ocr_fallback_jobs(user_id,storage_path) values('"+owner+"','"+path+"');")
    receipt = start("BEGIN; SET application_name='qa_receipt_first'; insert into public.receipts(user_id,storage_path) values('"+owner+"','"+path+"'); SELECT 'READY';")
    marker(receipt, 'READY')
    expiry = start("SET application_name='qa_expiry_wait'; select storage_path from public.expire_ocr_fallback_jobs();")
    wait_blocked('qa_expiry_wait')
    finish(receipt)
    finish(expiry, '')
    assert expiry.stdout.read().strip() == ''
    assert sql("select storage_deletion_claimed_at is null from public.ocr_fallback_jobs where storage_path='"+path+"';") == 't'
    results.append({'case': 'receipt_commits_before_waiting_expiry', 'pass': True})

    path = owner+'/ocr/claim-wins.jpg'
    sql("insert into public.ocr_fallback_jobs(user_id,storage_path) values('"+owner+"','"+path+"');")
    expiry = start("BEGIN; SET application_name='qa_claim_first'; select count(*) from public.expire_ocr_fallback_jobs(); SELECT 'READY';")
    marker(expiry, '1'); marker(expiry, 'READY')
    receipt = start("SET application_name='qa_receipt_wait'; insert into public.receipts(user_id,storage_path) values('"+owner+"','"+path+"');")
    wait_blocked('qa_receipt_wait')
    finish(expiry)
    receipt.stdin.close()
    assert receipt.wait(timeout=20) != 0
    assert 'OCR_IMAGE_DELETION_CLAIMED' in receipt.stderr.read()
    assert sql("select count(*) from public.receipts where storage_path='"+path+"';") == '0'
    results.append({'case': 'claim_commits_before_waiting_receipt', 'pass': True})

    # Simulate arbitrarily delayed Storage DELETE after the DB transaction ends.
    for action in ["insert into public.receipts(user_id,storage_path) values('"+owner+"','"+path+"');",
                   "insert into public.ocr_fallback_jobs(user_id,storage_path) values('"+owner+"','"+path+"');"]:
        try: sql(action)
        except subprocess.CalledProcessError as error:
            assert 'OCR_IMAGE_DELETION_CLAIMED' in error.stderr
        else: raise AssertionError('A committed deletion claim was bypassed')
    assert path in sql('select storage_path from public.expire_ocr_fallback_jobs();')
    results.append({'case': 'delayed_failed_storage_delete_retains_claim_and_retry', 'pass': True})
    print(json.dumps({'environment': 'isolated real PostgreSQL, no network or host bind mounts', 'cases': results}, indent=2))
finally:
    # Only our fixed DB inside the validated disposable container is removed.
    sql('DROP DATABASE '+database+' WITH (FORCE);', 'postgres')
