# Keepsake controlled response loss — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Source: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), follow-up to [media retry](KEEPSAKE_MEDIA_RETRY_TDD.md) and [outbox acknowledgement](KEEPSAKE_OUTBOX_ACK_TDD.md). No commit/push, public release, backend deployment, database migration or permission change.

## Isolation and test artifact

- Existing AVD, separate `com.picket.mobile.qa` package. Main Google account/package untouched. Generated QA users A/B only; owner allow-list added to the loopback proxy, upstream still validates JWTs. A non-QA request returned 403 before forwarding.
- QA APK intentionally debuggable for `run-as` access to **only its keepsake SQLite DB**, not Auth storage. Cleartext allowed only for loopback. Bundle verified to contain `http://127.0.0.1:18080`; never distribute this artifact. Build PASS 1m34s; `.artifacts/roadmap-qa/picket-media-fault-qa.apk`, 79,270,862 bytes, SHA-256 `33e438e60cd5e88cd7b5e0346b40ef9cc5f344db435d153dcf3dd4b5d70ad16a`.
- Proxy drops a successful keepsake mutation response and then returns 503 for keepsake routes until explicitly resumed, preventing an immediate fresh GET from clearing the pending state before restart.
- No RLS/grants altered. Server audit uses sessions of generated QA owners; no personal session extracted. Signing-denial probe between QA users returned 400, no signed URL exposed.

## Invalid preliminary attempt — not queue acceptance

The first POST/selected CORD photo reached the server and its response was dropped. Server audit found one row and one object; the new image survived. However the app was stopped while UI still said busy, before fallback could persist the outbox, and SQLite was empty. This is **not** a passing durable-create/restart test. Persisting intent before every network operation remains open.

An obsolete proxy process also caused a resume command to hit an older harness version. Preliminary QA images/users were cleaned; only identified task-owned processes were stopped. The replacement proxy announced v2 only after binding its port. The valid acceptance below used that fresh proxy and new generated A/B users. No main-app data affected.

## Valid controlled PATCH loss

1. Seeded a public CORD photo and row `3550f062-0dd1-4636-a42c-dac23a2c0267`, title `QA_MEDIA_FAULT_UPDATE`, version 1, under user A. This is a cloud-photo/metadata test, not native OCR or new-photo upload acceptance.
2. Android edited note to `QA_PATCH_LOST_RESPONSE`. Proxy observed PATCH 200/version 2, set `responseDropped=true`, closed the socket, and blocked subsequent keepsake requests with 503.
3. Waited for explicit durable-local UI message **before** stopping the app. QA SQLite contained one pending row with original remote version 1, original mediaPath and `photo_upload_required=0`.
4. Restarted while keepsake API remained unavailable; the pending note survived. Resumed API and refreshed the collection. QA SQLite became empty.
5. User-scoped server audit still returned exactly one row/version 2 and one image, unchanged path and object ID `cec31448-a1b6-48a8-b286-50b3dd56ff8f`. Proxy event assertion found exactly one successful PATCH for this item, and it was the dropped response. 503 attempts did not mutate the server.

This passes the controlled lost-response **metadata update**/restart/fresh-server-ack branch. It does not prove durable create-before-network, image replacement cleanup, concurrent edits at the SQLite acknowledgement boundary or disk-full recovery.

## Pending media across A–B–A

- A edited the same row to `QA_PENDING_MEDIA_A_B`; another successful PATCH response was dropped and subsequent keepsake calls blocked. UI confirmed local persistence. SQLite retained one pending version-2 row with A's media path.
- Logged out A through the pending-data warning, logged in B. UI showed `Roadmap QA B` and no A item/image; B's API rows and Storage objects were empty.
- Removed adb reverse, enabled airplane mode/disabled Wi-Fi, confirmed default network none, restarted B. B remained owner and its collection stayed empty; QA SQLite still retained A's pending row.
- A-to-B Storage signing request for A's exact image path was rejected (400). This is one owner-isolation case, not a full RLS/security audit.
- Returned to A with adb reverse still absent: the pending note and A-owned SQLite row survived. Restored reverse and restarted/refreshed A: fresh-server acknowledgement cleared the queue, server remained version 3 with one row and one unchanged image object.
- Across both edits the event assertion found exactly two successful PATCH 200 operations, both with deliberately dropped responses. No extra successful retry mutation occurred.
- Removed reverse again, enabled airplane mode/disabled Wi-Fi, confirmed default network none and restarted A. The image control was present. Read only the known public-image cache file from the QA package: 120,052 bytes, SHA-256 `a7efa7596757d7916c5e454e8bd98e3371cdf476ac737a269693804484cfc193`, identical to the public CORD source. Queue remained empty after acknowledgement.

## Cleanup and verification

- Deleted only the generated QA image folders; owner-scoped Storage audit returned `objects: []`. Then purged the generated A/B fixture data and deleted both QA Auth accounts. These temporary test records/images were hard-deleted, not archived; no personal data was removed.
- Restored connectivity, removed the loopback adb reverse, force-stopped the QA package and stopped the verified task-owned proxy process. Left the emulator open in the main app: `Chào Son Nguyen`, balance -261,345 VND, airplane mode off. No main-app session/token was extracted.
- Mobile regression suite 162/162 passed in this increment. The signed QA build passed; it is isolated, debuggable and **not** a distributable production APK. Public ARM64/landing unchanged. No commit/push.
- Acceptance is limited to metadata PATCH response loss, durable fallback after the local-save confirmation, fresh-server acknowledgement and one pending cached-photo A–B–A case. New-photo create-before-network durability, replacement cleanup, overlapping edits, disk-full and the full account/token matrix remain open.

## Evidence and limits

Ignored `.artifacts/roadmap-qa/`: `media-fault-events.json`, `proxy-events.json`, `media-fault-audit-A.json`, `media-fault-audit-B.json`, `keepsake-db-*/`, and `media-fault-*`/`media-switch-*` UI XML. Helpers contain no persistent secret values; test credentials remain in process memory.

Native UI automation hit a dump exit 137/off-screen-header navigation issue during recovery; observations were refreshed rather than counting failed UI actions as product acceptance. The final audit file was refreshed after image cleanup and therefore shows no objects; the pre-cleanup object count/ID is recorded above. Proxy credentials existed only in memory; the process has been stopped.
