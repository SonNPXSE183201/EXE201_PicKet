# Keepsake media retry — 2026-10-19

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Latest acceptance (2026-10-20): [KEEPSAKE_CONTROLLED_LOSS_ANDROID.md](KEEPSAKE_CONTROLLED_LOSS_ANDROID.md) supersedes the historical missing-case notes below for metadata PATCH response loss, exact queue/object audit and one pending cached-photo A–B–A case only. Durable create-before-network and new/replacement-photo fault cases remain open.

Source: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), media/offline acceptance. Scope: Expo only; no API, migration, Storage policy, production data or public APK changes. User explicitly requested **no commit/push**, overriding skill checkpoint guidance.

## Findings and changes

1. Online save previously removed its newly uploaded image whenever the API promise rejected before acknowledgement. A dropped response after a committed mutation could therefore leave the live row referencing a deleted image. The new save coordinator never deletes a new image on an ambiguous mutation failure; it cleans only a replaced old path after confirmed success.
2. Online and outbox retries previously allocated a new random Storage object every attempt. Both now use owner/item/SHA-256-of-bytes paths with upsert; identical bytes for the same owner/item address one object, while another owner/item or replacement bytes address another path. Uses the already installed `@noble/hashes`, no new dependency. Existing owner-scoped Storage insert/update policies support this operation; native/live Storage acceptance remains pending.
3. The form now allocates the item UUID before calling the online save, retaining the same ID in the fallback outbox instead of generating another row ID after a lost create response.
4. Outbox replay compares a **fresh server collection**, not a cached snapshot, against exact owner/ID/content/media path and a newer version. Matching data acknowledges the prior save instead of posting a duplicate create or sending a stale update. Different server edits remain pending rather than silently overwritten.

## RED/GREEN evidence

- Runner: existing npm/tsx + node:test (`test:keepsakes`). No new test dependency.
- RED 1: new policy test module failed to import the missing `keepsake-media-policy` implementation (18 existing tests passed, one test-file failure). This is the intended missing implementation gate, not a native/server reproduction of the old bug.
- GREEN 1: five policy tests passed after implementation; keepsake target 23/23.
- RED 2: acknowledgement test executed and failed because `isKeepsakeReplayConfirmed` was not a function; other 23 tests passed.
- GREEN 2: keepsake target 24/24. Includes a fake server committing its media path and then losing the response; asserts the referenced object survives. Also covers upload failure, cleanup failure after save, metadata-only save, owner/item/content isolation, create acknowledgement and changed server fields/version rejection.
- Typecheck initially caught an invalid non-async callback and an incomplete test fixture; both corrected, `npm run typecheck --prefix apps/mobile` PASS.
- `npm run lint --prefix apps/mobile`: 0 errors, 24 pre-existing warnings; changed files introduce no lint findings.
- Policy coverage: `node --experimental-test-coverage --test-coverage-include=apps/mobile/src/features/keepsakes/keepsake-media-policy.ts --import ./apps/mobile/node_modules/tsx/dist/loader.mjs --test apps/mobile/src/features/keepsakes/keepsake-media-policy.test.ts`: 6/6 PASS; lines 100%, branches 97.5%, functions 100%. Coverage is only this pure policy module, not the native adapters.
- Production Android JavaScript export PASS: 1,624 modules, output ignored under `.artifacts/media-retry-export`. This is not a signed APK build or device acceptance.
- Full regression `npm run test:mobile`: **158/158 PASS**, 0 failures, 0 skipped across all 11 test targets. No Dart or web logic changed in this increment.
- Targeted scan of changed media code found no console.log/service-role patterns. Not a full security audit.

## Remaining acceptance and risks

- Initial source-only increment: `adb devices` returned no attached device. The subsequent Android acceptance below supersedes that environment status; two-owner isolation and full fault-injection acceptance remain open.
- Need signed QA APK + isolated fixtures: new image → upload → drop API response after commit → restart → reconnect → one row/path, empty outbox. Repeat with update/replacement and overlapping loads; inspect Storage and actual displayed photo.
- No durable cleanup journal yet. Ambiguous failures intentionally retain the uploaded object, including rejected mutations, until ownership can be established safely. Failed old-image cleanup may leave an orphan. Do not garbage-collect uncertain objects based only on client errors.
- Saving intent before *every* network operation, concurrent edits/replays, account changes during an in-flight request, all legacy schemas, cache encryption/budget and full media backup remain separate work. Matching fresh content is acknowledgement, not a general multi-device merge policy.
- APK **1.0.1/code 2 on the landing is unchanged** and does not contain this working-tree fix. No commit, push, deployment or public release in this increment.

## Android follow-up — 2026-10-19

- Started `Picket_Production_Test`, waited for `sys.boot_completed=1`. Initial app had no session; user completed Google login and explicitly confirmed it. Did not read their password/access/refresh token or clear application data.
- Production x86_64 `assembleRelease` PASS in 5m10s, 834 tasks (70 executed). `apksigner verify` PASS with the existing Picket certificate; package `com.picket.mobile`, version 1.0.1/code 2, x86_64 only. Local test APK `.artifacts/ui-redesign/picket-completion-emulator.apk`, 72,169,995 bytes, SHA-256 `d42a7c9732de22919838f074473c8e31cd3fc01fe77190c68f0d6064a4dffa97`. Installed with `adb install -r`: Success; Google owner and baseline balance -261,345 VND retained.
- Created only fixture `QA_MEDIA_RETRY_20261019`, value 0, no financial transaction mutation. Copied public CORD image to Pictures, but the actual native picker selection was a **blank-login-screen screenshot generated during this test**, not CORD. Inspected the saved image: no password/token or filled login fields. Do not count this as a public receipt/camera/OCR test.
- Turned airplane mode on and Wi-Fi off. Save displayed the durable-local/offline message; subsequent `dumpsys connectivity` confirmed `Active default network: none`. The initial network switch still briefly reported network 109, so this is not a precisely controlled drop-after-commit experiment.
- Force-stop/cold-start offline, navigate through Profile → keepsakes: exactly one fixture visible, image intact (screenshot inspected), pre-existing `EE2E Offline Keepsake` still present. Auth owner/cache restored offline.
- Reconnected (network 111), reopened collection, then edited the fixture note to `QA_NATIVE_SYNC_20261019`. Production API access logs show one POST 201 in the observed interval and PATCH 200 for ID `142af36c-5733-40e1-8a5e-b2f4f424ac5c`; repeated collection loads returned 200. This supports create/update acceptance, not a comprehensive duplicate-record audit.
- Second force-stop/cold-start with network none: fixture image and saved note persisted. Inspected `.artifacts/picket-media-postsync-offline.png` and Android form text. This verifies post-sync cache availability for this fixture, not every historical image.
- Restored connectivity (network 113), archived only the fixture through its Android confirmation dialog. API DELETE 200 for the same ID with `expectedVersion=2`; existing keepsake retained. Archiving is recoverable server state, not a hard purge. Storage cleanup is best-effort; object deletion/count was not independently confirmed.
- Direct read-only service-role query for the exact fixture returned 403/permission denied on `public.keepsakes`; **no grants, RLS or account permissions were changed**. No user session was minted to bypass this. Storage object count and outbox row count remain unverified.
- Cold deep-link requests for keepsakes landed on Dashboard during auth startup; warm navigation/ordinary Profile navigation worked. This is an observed routing follow-up, not a fixed issue in this increment.
- Added a composed in-memory restart/retry regression: upsert same owner/item/content path, commit then lose response, fresh server acknowledgement → one object path/one row in the fake adapter. Keepsake target **25/25**, full mobile **159/159**, no failures/skips; typecheck PASS. This does not replace the outstanding controlled native fault-injection test.
- Public ARM64 APK/landing, BE and migrations untouched. No commit/push. Still pending: controlled lost-response/retry on Android with object/outbox audit, photo replacement/concurrent requests, A–B media isolation and durable orphan cleanup.
- Final UI check: fixture absent, pre-existing keepsake retained, Home still `Chào Son Nguyen` and -261,345 VND; network 113 active. Current-process AndroidRuntime/ReactNativeJS error filter returned 0 lines (not a full log/security audit). Latest policy coverage 7/7 tests, 100% lines/functions and 97.5% branches.
