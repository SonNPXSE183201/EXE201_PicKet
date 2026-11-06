# Bulk offline result — 2026-10-18

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Plan: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md), bulk partial failure/retry.

## Reproduced defect

`archive` and `update` persist a durable mutation and throw `OfflineQueuedError` when disconnected. `runBulkAction` previously classified every exception as failure. An archived row disappears optimistically, so reporting it as a still-selected failed row was misleading; retrying a queued update also risks unnecessary duplicate work.

## RED/GREEN

Added mixed success/queued/conflict, retry-only-failed and duplicate-ID tests. RED: 3/6 transaction tests failed (missing queued result, queued classified as failed, duplicate processed twice). GREEN: 6/6 transaction tests passed after separating `queuedIds` and de-duplicating inputs. UI removes completed/queued IDs from selection and explicitly states how many are saved locally awaiting sync, keeping true failures selected.

`bulk-action.ts` coverage: 100% lines/functions, 93.75% branches. Existing conflict error remains a true failure; no new automatic retry or server override added. All mutation semantics/idempotency remain in the existing providers/queue. No checkpoint commit or production deployment requested/performed.

Additional cache policy regression: newest duplicate wins; oversized image skipped; exact budget accepted; zero budget empty; input array preserved. UI tests 17/17 passed. Native bulk offline acceptance follows below after APK build.

## Native acceptance

- Built and installed updated signed x86_64 `.artifacts/ui-redesign/picket-completion-emulator.apk`, retaining the Google session. No backend deploy/migration.
- Created disposable fixture `E2E-BULK-OFFLINE-1018` for 3,456 VND online. Opened bulk editor, selected only this fixture, enabled airplane mode/Wi-Fi off, and confirmed archive for exactly one row.
- UI showed `0/1 giao dịch đã xử lý. 1 giao dịch đã lưu trên máy, chờ đồng bộ.` and `Đã chọn 0` (`bulk-offline-confirm.xml`, `bulk-offline-result.xml`). This directly verifies the previously misleading error is fixed.
- Force-stopped/reopened and restored network. Home returned to baseline -261,345 VND with no pending-change banner (`bulk-reconnected.xml`). Fixture is archived, not hard deleted; pre-existing rows untouched. This is UI evidence, not a separate server audit.
- Full mobile suite 108/108 passed; TypeScript passed; signature verification passed; bulk pure-function coverage 100% lines/functions and 93.75% branches. Mixed authoritative server conflict + success in a single native bulk operation still needs controlled E2E; pure tests cover its classification/retry but do not replace device acceptance.
