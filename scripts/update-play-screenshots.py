import sys
import tomllib
import json
from pathlib import Path

# Add play-deps to sys.path
play_deps = Path('.artifacts/mobile-bugs-20261028/play-deps').resolve()
sys.path.insert(0, str(play_deps))

import httplib2
import google_auth_httplib2
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

root = Path.cwd()
pkg = 'com.picket.mobile'
screenshots_dir = root / '.artifacts/google-play-assets/play-screenshots-v2'

assert screenshots_dir.exists(), f"Screenshots directory missing at {screenshots_dir}"

# Load credentials
config = tomllib.loads((Path.home() / '.codex/config.toml').read_text('utf8'))['mcp_servers']['google-play']['env']
credentials = service_account.Credentials.from_service_account_file(
    config['GOOGLE_APPLICATION_CREDENTIALS'],
    scopes=['https://www.googleapis.com/auth/androidpublisher']
)
http_auth = google_auth_httplib2.AuthorizedHttp(credentials, http=httplib2.Http(timeout=180))
api = build('androidpublisher', 'v3', http=http_auth, cache_discovery=False)

print("Starting Google Play Edit for new Paper UI screenshots update...", flush=True)
edit_id = api.edits().insert(packageName=pkg, body={}).execute()['id']
print(f"Created edit: {edit_id}", flush=True)

committed = False
try:
    for lang in ['vi', 'en-US']:
        print(f"\nUpdating screenshots for locale '{lang}'...", flush=True)
        # Delete existing screenshots
        api.edits().images().deleteall(
            packageName=pkg,
            editId=edit_id,
            imageType='phoneScreenshots',
            language=lang
        ).execute()
        print(f"  Cleared old screenshots for {lang}.", flush=True)

        for i in range(1, 8):
            img_file = screenshots_dir / f"{i:02d}.jpg"
            assert img_file.exists(), f"Missing screenshot {img_file}"
            img_media = MediaFileUpload(str(img_file), mimetype='image/jpeg', resumable=False)
            upload_res = api.edits().images().upload(
                packageName=pkg,
                editId=edit_id,
                imageType='phoneScreenshots',
                language=lang,
                media_body=img_media
            ).execute(num_retries=3)
            print(f"  Uploaded {lang} {img_file.name} (id: {upload_res.get('id')})", flush=True)

    # Validate edit
    print("\nValidating edit with Google Play API...", flush=True)
    api.edits().validate(packageName=pkg, editId=edit_id).execute()
    print("Validation passed successfully.", flush=True)

    # Commit edit
    print("Committing edit to Google Play...", flush=True)
    commit_receipt = api.edits().commit(packageName=pkg, editId=edit_id).execute()
    committed = True
    print(f"Commit successful! Receipt: {commit_receipt}", flush=True)

    # Independent readback verification
    print("\nPerforming independent verification readback...", flush=True)
    verify_edit_id = api.edits().insert(packageName=pkg, body={}).execute()['id']
    try:
        for lang in ['vi', 'en-US']:
            imgs = api.edits().images().list(packageName=pkg, editId=verify_edit_id, language=lang, imageType='phoneScreenshots').execute()
            img_list = imgs.get('images', [])
            count = len(img_list)
            print(f"Readback confirmed: {lang} has {count} phoneScreenshots.", flush=True)
            assert count == 7, f"Expected 7 screenshots for {lang}, found {count}"
            for item in img_list:
                print(f"  - id: {item.get('id')}, sha256: {item.get('sha256')[:16]}...")
    finally:
        api.edits().delete(packageName=pkg, editId=verify_edit_id).execute()

    print("\nALL GOOGLE PLAY PHONE SCREENSHOTS UPDATED & VERIFIED SUCCESSFULLY!", flush=True)

finally:
    if not committed:
        print(f"Discarding edit {edit_id}...", flush=True)
        try:
            api.edits().delete(packageName=pkg, editId=edit_id).execute()
        except Exception as e:
            print(f"Error discarding edit: {e}", flush=True)
