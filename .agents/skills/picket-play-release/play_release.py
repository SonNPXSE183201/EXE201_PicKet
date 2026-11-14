"""Upload a Picket Play build and update testing tracks with the Android Publisher API.

Run with the Play MCP virtualenv (it has google-api-python-client):
  C:/Users/nguyen.son/.codex/tools/play-store-mcp/.venv/Scripts/python.exe play_release.py internal \
      --aab <aab> --mapping <mapping.txt> --code 33 --name "1.0.19 (33)" --notes-vi "..." --notes-en "..."
  ... play_release.py alpha --code 33 --name "1.0.19 (33)" --notes-vi "..." --notes-en "..."

Rules enforced here:
- `internal` uploads the AAB (resumable, verified by SHA-256) and the R8 mapping, then sets the internal release.
- `alpha` (closed testing) never uploads; it refuses unless every current alpha version code is LOWER than --code,
  and only replaces the release list with the newer version. Testers, countries and the track are never touched,
  halted or removed.
- `production` is deliberately not supported.
"""
import argparse
import hashlib
import os
from pathlib import Path

import google_auth_httplib2
import httplib2
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

PKG = 'com.picket.mobile'
KEY = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', 'C:/Users/nguyen.son/Downloads/google-play-key.json')

parser = argparse.ArgumentParser()
parser.add_argument('track', choices=['internal', 'alpha'])
parser.add_argument('--aab')
parser.add_argument('--mapping')
parser.add_argument('--code', required=True)
parser.add_argument('--name', required=True)
parser.add_argument('--notes-vi', required=True)
parser.add_argument('--notes-en', required=True)
args = parser.parse_args()

raw = httplib2.Http(timeout=900)
raw.redirect_codes = raw.redirect_codes - {308}  # resumable uploads answer 308 Resume Incomplete
cred = service_account.Credentials.from_service_account_file(KEY, scopes=['https://www.googleapis.com/auth/androidpublisher'])
edits = build('androidpublisher', 'v3', http=google_auth_httplib2.AuthorizedHttp(cred, http=raw), cache_discovery=False).edits()

edit = edits.insert(packageName=PKG, body={}).execute()['id']
done = False
try:
    if args.track == 'internal':
        aab, mapping = Path(args.aab or ''), Path(args.mapping or '')
        assert aab.is_file() and mapping.is_file(), 'missing --aab or --mapping'
        digest = hashlib.sha256(aab.read_bytes()).hexdigest()
        request = edits.bundles().upload(packageName=PKG, editId=edit, media_body=MediaFileUpload(
            str(aab), mimetype='application/octet-stream', resumable=True, chunksize=8 * 1024 * 1024))
        response = None
        while response is None:
            status, response = request.next_chunk(num_retries=5)
            if status:
                print(f'upload {int(status.progress() * 100)}%', flush=True)
        assert str(response['versionCode']) == args.code and response['sha256'] == digest, response
        edits.deobfuscationfiles().upload(
            packageName=PKG, editId=edit, apkVersionCode=int(args.code), deobfuscationFileType='proguard',
            media_body=MediaFileUpload(str(mapping), mimetype='application/octet-stream', resumable=True)).execute(num_retries=5)
        print(f'uploaded AAB {args.code} sha256 {digest} + mapping', flush=True)
    else:
        current = edits.tracks().get(packageName=PKG, editId=edit, track='alpha').execute()
        codes = {c for r in current.get('releases', []) for c in r.get('versionCodes', [])}
        assert codes and all(int(c) < int(args.code) for c in codes), f'alpha has {codes}; only a newer code may be added'
        print('alpha before', sorted(codes), flush=True)
    notes = [{'language': 'vi-VN', 'text': args.notes_vi}, {'language': 'en-US', 'text': args.notes_en}]
    edits.tracks().update(packageName=PKG, editId=edit, track=args.track, body={'track': args.track, 'releases': [
        {'name': args.name, 'versionCodes': [args.code], 'status': 'completed', 'releaseNotes': notes}]}).execute()
    print('commit', edits.commit(packageName=PKG, editId=edit).execute(num_retries=3).get('id'), flush=True)
    done = True
finally:
    if not done:
        try:
            edits.delete(packageName=PKG, editId=edit).execute()
        except Exception as error:  # best effort cleanup
            print('edit cleanup failed:', error)
