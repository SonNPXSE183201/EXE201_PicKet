# Guest receipt commit/progress recovery — 2026-10-21

Scope: local-only Expo Android receipt creation. Cloud receipt lost-response acceptance is reported separately. The real-user app/package and cloud finances are not changed by these tests.

## Reproduced gap and implementation

The guest branch previously generated a fresh transaction UUID on every `create` call. Process death after the encrypted guest finance commit but before `pending_receipt_drafts.transaction_id` persisted could create a second transaction. Its receipt metadata also came from mutable form state rather than the original request.

- Pin the complete owner/draft-bound encrypted request before any guest transaction mutation, using the existing request journal. Inspect the image before creating a financial row.
- Reuse the capture/pending UUID as the guest transaction identity. Existing older drafts with a recorded transaction ID keep that ID; a missing recorded transaction is an error, not permission to recreate it.
- Make the create-once decision inside the existing serialized `guest.commit(current => …)` path. New rows still validate the wallet, amount and closed month. Exact retries return the existing state without changing version/timestamps, even after the month is closed or its wallet is removed. Different payloads cannot overwrite an existing ID.
- Store receipt creation IDs in the same encrypted finance snapshot as the transaction. A deliberate transaction deletion during the commit/progress crash window therefore cannot resurrect on retry. This optional field is backward-compatible with older snapshots. Backup validation rejects malformed/duplicate ledger entries and bounds the ledger to 50,000 entries with IDs no longer than 200 characters.
- Guest receipt merchant, amount and date come from the pinned canonical request. Receipt storage remains keyed by transaction ID.

No server migration, API deployment or public APK update is required.

## Test ledger

| ID | Action | Expected | Evidence / status |
| --- | --- | --- | --- |
| GRC-01 | Commit finance; omit progress acknowledgement; JSON restart and replay | Same state/transaction/timestamps; one row | Local reducer PASS |
| GRC-02 | Replay after closing the month and removing wallet | No-op reading the prior result; a new ID remains rejected | Local reducer PASS |
| GRC-03 | Reuse ID with changed title/amount/kind/wallet/category/note/time/destination/refund/deleted state | Reject; preserve original transaction | Local reducer PASS |
| GRC-04 | Create a new receipt with missing wallet, invalid amount or closed month | Reject before writing | Local reducer PASS |
| GRC-05 | Delete transaction deliberately in the progress crash window; restart/replay | Reject; do not resurrect the deleted transaction | RED 4/5, GREEN 5/5 after durable tombstone |
| GRC-06 | Restore old snapshot or valid new ledger | Backward-compatible; preserve new ledger | Backup model PASS |
| GRC-07 | Restore malformed/duplicate/oversized ledger | Reject before replacing local finance | RED 1/2, GREEN 2/2 |
| GRC-08 | Native Android inject progress write failure after guest finance commit; force-stop and retry | One financial row/receipt, original payload and one balance change | PASS native Android 35 QA. Scoped SQLite trigger raised ABORT after finance commit; pending progress stayed null with encrypted canonical payload. Restart/retry used same transaction ID; UI count stayed one, one encrypted receipt, both journals removed, capture did not resurrect. Evidence `guest-progress-ce36b63f/result.json`, `guest-receipt-progress-slow-input-native.log` |
| GRC-09 | Concurrent native retry, original transaction intentionally edited/deleted, and backup/restore round-trip with ledger | No duplicate, overwrite or resurrection | Intentional deletion branch PASS native: after injected progress failure, user deletes the financial transaction through Android UI; retry rejected after two cold restarts, search remains 0. Evidence `guest-receipt-deleted-retry-native.log`, fixture `b691852f`. Concurrent taps, intentional edits and backup/restore round-trip with ledger remain OPEN; this row is not fully closed |

Reducer verification: `guest-finance.test.ts` plus `guest-receipt-retry.test.ts`, 17 PASS; targeted coverage **97.78% lines, 88.32% branches, 92.68% functions** in `guest-finance.ts`. Log: `.artifacts/roadmap-qa/guest-receipt-coverage.log`. Complete stable worktree suite: **320 PASS, 0 FAIL, 0 SKIP**, `part12-stable-guest-tests.log`. Typecheck and commit-hook lint passed. x86_64 QA release build passed (`part12-stable-guest-build.log`); production ARM64/landing unchanged.

Verification hygiene: an earlier coverage run overlapped a partial-staging commit hook, which temporarily hid an existing unstaged money-validation change and caused that unrelated test to fail. That run is retained as invalid mixed-snapshot evidence, not a product PASS. The stable full suite and targeted coverage above were rerun after hooks completed. Do not run builds/tests while a hook temporarily hides worktree changes.

Local checkpoints: RED `b279483`, create-once GREEN `657ca11`; deletion RED `617e08b`, backup-ledger RED `f076b68`, durable ledger GREEN `a66b129`. The create-once commit was corrected before publication to exclude an unrelated keepsake-screen change; that work remains in the worktree. Nothing was pushed.
