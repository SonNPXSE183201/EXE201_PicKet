import sys
import tomllib
import json
import hashlib
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
aab_path = root / '.artifacts/releases/picket-1.0.14-28-google-play.aab'
screenshots_dir = root / '.artifacts/google-play-assets/play-screenshots-v2'

assert aab_path.exists(), f"AAB file missing at {aab_path}"

# Load credentials
config = tomllib.loads((Path.home() / '.codex/config.toml').read_text('utf8'))['mcp_servers']['google-play']['env']
credentials = service_account.Credentials.from_service_account_file(
    config['GOOGLE_APPLICATION_CREDENTIALS'],
    scopes=['https://www.googleapis.com/auth/androidpublisher']
)
http_auth = google_auth_httplib2.AuthorizedHttp(credentials, http=httplib2.Http(timeout=300))
api = build('androidpublisher', 'v3', http=http_auth, cache_discovery=False)

print("Starting Google Play Edit for internal release & screenshot update...", flush=True)
edit_id = api.edits().insert(packageName=pkg, body={}).execute()['id']
print(f"Created edit: {edit_id}", flush=True)

committed = False
try:
    # 1. Upload AAB bundle
    print(f"Uploading AAB: {aab_path.name} ({aab_path.stat().st_size} bytes)...", flush=True)
    media_bundle = MediaFileUpload(str(aab_path), mimetype='application/octet-stream', resumable=False)
    bundle_result = api.edits().bundles().upload(
        packageName=pkg,
        editId=edit_id,
        media_body=media_bundle
    ).execute(num_retries=3)
    print(f"AAB uploaded successfully. VersionCode: {bundle_result.get('versionCode')}, sha256: {bundle_result.get('sha256')}", flush=True)
    assert bundle_result.get('versionCode') == 28, f"Unexpected versionCode: {bundle_result.get('versionCode')}"

    # 2. Update Internal track
    track_body = {
        'track': 'internal',
        'releases': [{
            'name': '1.0.14',
            'versionCodes': ['28'],
            'status': 'completed',
            'releaseNotes': [
                {
                    'language': 'vi-VN',
                    'text': 'Cập nhật giao diện Paper mới, tối ưu nhận diện hóa đơn và danh mục, tăng độ ổn định ứng dụng.'
                },
                {
                    'language': 'en-US',
                    'text': 'New Paper UI design, improved receipt scanning and category recognition, general stability enhancements.'
                }
            ]
        }]
    }
    print("Updating internal track...", flush=True)
    track_result = api.edits().tracks().update(
        packageName=pkg,
        editId=edit_id,
        track='internal',
        body=track_body
    ).execute()
    print("Internal track updated.", flush=True)

    # 3. Update screenshots for 'vi' and 'en-US'
    for lang in ['vi', 'en-US']:
        print(f"Updating screenshots for locale '{lang}'...", flush=True)
        # Clear existing screenshots
        api.edits().images().deleteall(
            packageName=pkg,
            editId=edit_id,
            imageType='phoneScreenshots',
            language=lang
        ).execute()

        for i in range(1, 8):
            img_file = screenshots_dir / f"{i:02d}.jpg"
            assert img_file.exists(), f"Missing screenshot {img_file}"
            img_media = MediaFileUpload(str(img_file), mimetype='image/jpeg', resumable=False)
            api.edits().images().upload(
                packageName=pkg,
                editId=edit_id,
                imageType='phoneScreenshots',
                language=lang,
                media_body=img_media
            ).execute(num_retries=3)
            print(f"  Uploaded {lang} {img_file.name}", flush=True)

    # 4. Validate edit
    print("Validating edit...", flush=True)
    api.edits().validate(packageName=pkg, editId=edit_id).execute()
    print("Validation passed.", flush=True)

    # 5. Commit edit
    print("Committing edit to Google Play...", flush=True)
    commit_receipt = api.edits().commit(packageName=pkg, editId=edit_id).execute()
    committed = True
    print(f"Commit successful! Receipt: {commit_receipt}", flush=True)

    # Save receipt
    receipt_path = root / '.artifacts/releases/picket-1.0.14-28-play-submission.json'
    receipt_path.write_text(json.dumps({
        'package': pkg,
        'editId': edit_id,
        'bundle': bundle_result,
        'track': track_body,
        'commit': commit_receipt
    }, indent=2, ensure_ascii=False), encoding='utf8')

    # 6. Independent readback
    print("\nPerforming independent verification readback...", flush=True)
    verify_edit_id = api.edits().insert(packageName=pkg, body={}).execute()['id']
    try:
        readback_tracks = api.edits().tracks().list(packageName=pkg, editId=verify_edit_id).execute()['tracks']
        internal_track = next(t for t in readback_tracks if t['track'] == 'internal')
        assert any(r.get('status') == 'completed' and '28' in r.get('versionCodes', []) for r in internal_track.get('releases', [])), "Code 28 not completed on internal track!"
        print("Readback confirmed: Internal testing has version 1.0.14 code 28 completed!", flush=True)

        for lang in ['vi', 'en-US']:
            imgs = api.edits().images().list(packageName=pkg, editId=verify_edit_id, language=lang, imageType='phoneScreenshots').execute()
            count = len(imgs.get('images', []))
            print(f"Readback confirmed: {lang} has {count} phoneScreenshots.", flush=True)
            assert count == 7, f"Expected 7 screenshots for {lang}, found {count}"
    finally:
        api.edits().delete(packageName=pkg, editId=verify_edit_id).execute()

    print("\nALL GOOGLE PLAY INTERNAL TESTING & SCREENSHOT UPDATES VERIFIED SUCCESSFULLY!", flush=True)

finally:
    if not committed:
        print(f"Discarding edit {edit_id}...", flush=True)
        try:
            api.edits().delete(packageName=pkg, editId=edit_id).execute()
        except Exception as e:
            print(f"Error discarding edit: {e}", flush=True)
