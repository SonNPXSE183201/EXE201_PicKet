# Native reminder owner race — 21 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Reproduction and guarantee

Logout cleanup can finish before an already-running Android scheduling request returns. A pre-await owner check alone therefore permits a reminder from the previous account to remain scheduled.

`scheduleOwnedReminder` checks ownership before scheduling and after the OS response. If the owner changed, it cancels only that exact request identifier and stops the old batch. OS scheduling/cancellation errors propagate; no false success is returned. The existing owner-scoped reminder IDs, delivery ledger and generic lockscreen text are unchanged. Partner Notice is in-app partner content, not a scheduled OS advertisement.

## Evidence

| Stage | Result |
| --- | --- |
| RED `08af013` | Four executed tests fail for missing post-await cancellation and native wiring, `reminder-owner-red.log` |
| GREEN `1bc89d2` | Notification policy suite PASS, typecheck and commit-hook lint PASS, `reminder-owner-green.log` |
| Full mobile suite | 405 PASS, zero failures/skips, `reminder-owner-full-tests.log` |
| Scoped coverage | `budget-notice-delivery.ts`: 100% lines/functions, 97.30% branches, `reminder-owner-coverage.log` |
| Android native race | PASS `reminder-owner-0f42a95d/result.json`, `reminder-owner-native.log`: real Android future notification scheduled, return held 45 seconds, B verified before release; auth subscription invalidates A, exact late ID cancelled and absent from actual `getAllScheduledNotificationsAsync`. No financial mutation. Instrumented native integration, not manual UI E2E. |

QA build passed: x86_64/code 4, 83,762,128 bytes, SHA-256 `749c7f70cf3d76d5a17cc7a8022fcd463228a169d899fa6d44ae2d039b9f01af`. It contains internal integration probes and must not replace the public ARM64 APK. No API migration/deployment or GitHub push is required.
