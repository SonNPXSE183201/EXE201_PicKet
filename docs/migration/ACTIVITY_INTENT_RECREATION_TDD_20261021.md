# Android Activity intent retention — 2026-10-21

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Native reproduction

While running the large-font route matrix, a VIEW request for Bulk intermittently ended on Dashboard. This was not accepted as a font-screen PASS. A focused read-only QA reproduction then established:

1. Force-stop `com.picket.mobile.qa`; VIEW Home and wait for its heading.
2. VIEW `transactions/bulk`; wait for **Sửa nhiều giao dịch**.
3. Change system font scale to 1.5, causing Activity configuration recreation.
4. The app shows **Tài chính của bạn**, not Bulk.

Native RED: `.artifacts/roadmap-qa/config-intent-red.log` and `config-intent-red.json`, `retainedBulk=false`. The original font setting is restored in `finally`. No financial mutation is involved.

## Cause and scoped fix

Local installed framework code shows `ReactActivity.onNewIntent` dispatching without `setIntent`, while Expo's linking lifecycle `onCreate` reads `activity.intent.data` into its process-static initial URL. The Expo delegate can also decline delivery before `loadAppReady`. Therefore a later configuration recreation can read the first, stale Activity intent. The native RED above verifies the route-loss behavior; it does not prove every possible bootstrap race has the same cause.

- New persisted Expo config plugin `with-current-activity-intent` inserts a Kotlin `MainActivity.onNewIntent` override. It calls `setIntent(intent)` **before** delegating, retaining the latest VIEW or launcher intent even if the delegate is not ready.
- The initial redirect now prefers the current Activity URL, not Expo's process-static cached URL. Launcher starts without VIEW data retain the router root path.
- The existing warm-intent bootstrap gate remains. OAuth/recovery URLs remain opaque and are neither parsed nor logged by this fix.
- Plugin insertion is idempotent and refuses to overwrite a different custom override.

Checkpoints: local RED `be2f1e0`; implementation `950845f`. Unit/source verification: **7/7** navigation tests. Complete stable mobile suite: **322 PASS, 0 FAIL, 0 SKIP**, `part12-activity-intent-tests.log`. Typecheck/lint passed; real Expo Android prebuild generated the expected override (`activity-intent-prebuild.log`). Native QA compilation/acceptance is tracked below, not inferred from prebuild success.

## Required regression ledger

| ID | Case | Status |
| --- | --- | --- |
| AIN-01 | Home → VIEW Bulk → font 150%, 200%, 100%; route retained after each recreation | PASS native after fix: `config-intent-green.log`, `config-intent-green.json`, all three scales retained Bulk |
| AIN-02 | Cold VIEW and early warm intent while session bootstrap runs | PASS rerun of all five cases after precedence/native change: `bootstrap-current-activity-native.log`, `bootstrap-intents-current-activity-result.json` |
| AIN-03 | VIEW A → VIEW B → recreation; B wins | PASS native Keepsakes → Notifications, then density 480/font 150%/density reset: `config-intent-extra-result.json` |
| AIN-04 | Launcher without VIEW after a prior deep link | PASS native cold MAIN/LAUNCHER after Notifications; Home remains through font 200% recreation, same extra result JSON |
| AIN-05 | Actual OAuth/recovery callback during cold bootstrap | OPEN external-provider acceptance; pure URL preservation is not equivalent |

The larger font matrix is partial. Four routes at 150% have captured, route-verified top/scroll screenshots awaiting full visual/control-reachability review. The initial unverified snapshots, stale-route failure and UIAutomator XML failure are retained as invalid/failed harness attempts, not swept into a complete-screen PASS count. Resume only with route-heading checks and record any re-delivery separately from visual acceptance.
