# Receipt capture restart/retry — 2026-10-21

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Scope: Android Expo capture and receipt submission. No API/database-server deployment or real-account financial mutation. This report is not a declaration that the entire camera fault matrix passed.

## Problems reproduced

1. Opening an exact previously saved receipt removed its pending draft asynchronously but left the capture journal alive; returning to capture could resurrect it. Executed source-contract RED 0/1 (`9f0d2d7`).
2. Re-entering the same capture allocated a new pending-receipt ID and therefore a new transaction idempotency key. Executed handoff RED 0/1 (`492aba5`), then real SQLite statement suite RED 0/4 (`282cfe5`): repeated IDs failed the old INSERT's primary-key constraint.
3. A stable key alone does not preserve wallet/category/kind/note/timestamp after app death. Executed journal-wiring RED 0/1 (`bbc0eb3`); additional policy tests intentionally failed to import the missing journal implementation before it was written.
4. Native fault injection initially never reached transaction POST: the managed pending photo was absent. The new temporary-file cleanup could delete the destination after `File.move` changed the File object's URI. The first URI guard alone was insufficient: the installed Expo native `move` is asynchronous, so cleanup could run before relocation completed. RED handoff 6/7 reproduced the missing `await` contract. Receipt, capture and keepsake writers now await relocation; native rerun is required, not inferred from the source test.

## Implementation

- Same capture UUID becomes the pending receipt UUID. Local handoff writes are serialized by ID; foreign-owner collisions fail before touching a file.
- Temporary photo copy moves into place before committing a new row. Recovered unreferenced copies can be replaced, not another owner's referenced file. An ambiguous SQLite write/readback never deletes media that may already be referenced.
- SQL upsert updates editable metadata only while no upload, transaction or pinned request has made progress; owner predicate prevents cross-account overwrite. Deleting a different receipt/capture does not clear newer work.
- Before the first cloud upload, pin the complete canonical transaction request in an owner/receipt-bound encrypted SQLite payload. `COALESCE` preserves the first payload even with concurrent writers or lost local acknowledgement. Read/validation/persistence errors fail closed before network mutation.
- Retry after restart uses the original amount, wallet, category, kind, note and timestamp with the original idempotency key, not reconstructed defaults. A read-only original-request snapshot explains the retry. Loading draft fields no longer depends on route query title/amount or resets on same-owner token refresh.
- Exact duplicate recovery awaits capture completion and owner-scoped pending receipt removal before navigation. Probable duplicates retain the uncommitted draft. Cleanup errors are not hidden as completed work.

## Executed local verification

| Target | Evidence |
| --- | --- |
| Exact duplicate capture completion | GREEN 4/4 (`71a4991`), including probable matches, foreign owner, missing capture ID and cleanup errors |
| Native SQL handoff statements and file-move contracts | GREEN 7/7: stable identity, editable pre-submission fields, frozen upload/transaction, owner collision, first encrypted payload preservation, destination-safe cleanup and awaited relocation. File contracts are source checks, not filesystem fault acceptance |
| Canonical request journal | GREEN 7/7; concurrency/restart, owner isolation, read failure, lost write acknowledgement, malformed payload, missing row, normalization and text limits |
| Journal coverage | 100% lines, 97.78% branches, 93.33% functions; only `receipt-request-journal.ts`, not native IO/rendered screens |
| Typecheck / focused lint | PASS |

Implementation checkpoints: stable identity `541c64f`, encrypted full request and recovery snapshot `352eef1`.

Image fix checkpoints: cleanup RED `8fe92cf`, URI guard `0a6cede`; asynchronous-move RED `c322952`, awaited receipt/capture relocation `334e49c`. The keepsake storage file was already untracked work in the workspace; its one-line await correction is preserved without folding the unrelated module into these scoped commits.

## Required Android acceptance

Harness `.artifacts/native-capture-response-loss.py` uses a synthetic QA screenshot selected through Android Photos, not a receipt OCR-accuracy fixture. QA proxy commits upstream before withholding the response. Both modes require one transaction/receipt, same transaction ID, original kind/note, encrypted request payload, restart via Capture with same handoff identity, completed pending/capture journals, and no capture resurrection.

| Case | Current status |
| --- | --- |
| Transaction POST committed, response lost; restart Capture → retry original request | PASS on Android 35 QA after awaited-move fix: `capture-transaction-loss-awaited.log`, `capture-response-loss-transaction-73f2802e/result.json`; authoritative API reads confirm one transaction and one linked receipt, original income/note retained, encrypted pinned request, both journals removed and no resurrection |
| Receipt POST committed, response lost; restart Capture → exact duplicate → open saved receipt | PASS complete fresh Android run `capture-receipt-loss-verified-fixture.log`, `capture-response-loss-receipt-07a90ab8/result.json`: upstream 201 withheld, encrypted canonical payload, exact duplicate opened, exactly one transaction/receipt and both journals removed; cold Capture does not resurrect |
| Canonical category/wallet behavior if the original wallet is archived during retry | OPEN expanded acceptance |
| Authoritative validation rejection requiring edits to a pinned request | OPEN recovery-design follow-up; do not silently replay modified data under its pinned key |
| Guest creation killed between local transaction commit and pending progress update | Local RED/GREEN now implemented: stable draft identity, serialized create-once, canonical guest receipt metadata and durable creation tombstones (including intentional deletion in crash window). Android fault acceptance remains OPEN; cloud results do not prove it |

A pinned request intentionally cannot be edited as though it were a new request while commit outcome is unknown. No claim of full receipt-retry acceptance until the native rows above have actual results.

Harness corrections retained in evidence: the first receipt run committed successfully but its ADB text fixture lacked the initial `Q`; exact-title lookup therefore failed. A resume attempt also expected title-case alert buttons although Android renders them uppercase. A repeated local SQLite inspection reused stale copied WAL files and reported an already-deleted row. These were harness/precondition errors, not accepted product failures or passes. The final complete fresh run verifies input readback, uses the actual uppercase button, and keeps independent SQLite snapshot directories. Its exit status is zero and every financial/journal assertion passed.
