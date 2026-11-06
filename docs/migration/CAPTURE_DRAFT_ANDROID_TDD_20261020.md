# Durable capture draft — 2026-10-20

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Journey and scope

Source: camera/draft work remaining in `APP_COMPLETION_PLAN.md`. A user should be able to capture an image, edit incomplete OCR fields, leave/reopen the screen or restart Android's app process, and resume the same draft. Opening retake camera then cancelling must not discard the previous draft. Transaction completion must clear only the capture that produced it, not a newer capture.

This increment uses installed Expo FileSystem, Crypto, SQLite and the existing local encryption implementation. No dependency, server deployment, migration on Supabase, public APK or landing change.

## Implementation

- One owner-scoped capture row in local `picket-capture.db`, WAL enabled. The payload is encrypted with the existing device key and `capture-draft:<owner>` AAD. Metadata includes image reference, title, amount string (including incomplete edits), selected date, attachment choice, provider/confidence, OCR text/lines and fallback image path.
- Managed capture images have their own documents directory, not the keepsake cleaner's directories. Images are encrypted with `capture-photo:<owner>` AAD; unique temporary ciphertext is moved into place before metadata is committed. The old managed image is removed only after a replacement's metadata commits.
- Restoring an image decrypts it into an app-private temporary cache file required by OCR/manipulation and native image display. **Not all image cache bytes are encrypted**; the durable managed document image is encrypted. Camera/library originals are not deleted by this increment.
- A per-owner journal orders writes, reads and completion. Failed writes do not poison the next save; invalid records fail visibly rather than being silently overwritten with an empty draft.
- Camera waits for owner-specific hydration before autosave. Retake uses separate camera visibility instead of clearing the previous image. Image generations prevent stale local/fallback OCR results from replacing a later image.
- A capture ID is passed into the transaction flow. Successful guest/cloud/no-attachment transaction paths attempt completion of that exact capture; the journal prevents a stale mounted screen from resurrecting a completed capture. Receipt navigation/date/completion wiring already present in the working tree was retained with this integration.
- Camera copy now explains the device draft. This UX decision follows the mobile UI guidance: preserve interrupted work and make local storage/upload consent distinct.

## TDD evidence

| Guarantee | Test | Result |
| --- | --- | --- |
| Fresh journal restores edited state for A, never for B | `capture-journal.test.ts` | PASS |
| Reads wait for queued writes; last edit wins | Same target | PASS |
| Old completion cannot clear a newer capture | Same target | PASS |
| Completed capture cannot be resaved by its stale screen | Same target | PASS |
| Failed write retains previous state and later save can succeed | Same target | PASS |
| Malformed stored payload does not become a blank replacement | Same target | PASS |
| Camera hydration/autosave/generation and completion are wired | Same target, source contract, not a rendered React test | PASS |

Initial RED: focused target could not resolve the newly specified journal module. Normal hooks rejected the attempted RED commit; no bypass. The core implementation then passed six tests (`12e3c33`). A separate executed integration-wiring assertion produced **6 PASS / 1 FAIL**, checkpoint `01ad8f0`. After wiring, the same seven-test target passed; GREEN checkpoint `5d95226`.

The older picker source-contract regression initially failed because successful-selection resets moved into `acceptImage`. It was updated to assert cancellation returns before calling that method, and that the method commits the managed image and metadata before publishing its URI. Its guarantee was retained, not removed.

## Android evidence

Generated QA owner A only (`com.picket.mobile.qa`, `emulator-5556`); the real production account/package was not modified. The emulator's camera supplied a black/time-stamped test feed, not a real receipt; these tests prove draft/image lifecycle, **not OCR recognition accuracy**.

- Actual camera capture, then manual title `QA CAPTURE DURABLE` and amount `123456`.
- Cold restart → wait for the correct cached owner/home → open capture → title and formatted amount preserved. Managed encrypted image reference/content unchanged.
- Open retake camera → close it → previous image/title/amount retained.
- Rotate on Android, edit fields again, cold restart and reopen → rotated image and edits retained.
- Independently read the two restored cache images with EXIF orientation applied: original **970×1318**, rotated **1318×970**. This verifies swapped axes rather than inferring rotation from a randomized ciphertext hash.
- SQLite snapshot contained the expected owner row with an `enc-v1:` payload, without the edited title in plaintext. Managed image also starts with `enc-v1:`.
- Screenshot visually inspected: rotated image and selected **19/10/2026** date present.

Artifacts: `.artifacts/roadmap-qa/capture-durability/results.json`, `rotation-dimensions.json`, `restored.png`, the local SQLite/WAL snapshot, and `emulator-5556-capture-*-restored.xml` / `capture-retake-cancelled.xml`.

### Excluded attempts and limits

Early harness attempts were not counted as acceptance: one left an encrypted image without a metadata row; its precise cause was not isolated. Another install was attempted before a build had finished and correctly failed APK parsing. Later harness iterations sent a deep-link before auth bootstrap finished or waited for an off-screen field without scrolling. The accepted follow-up waited for the correct owner and scrolled to fields. Failed-write/crash orphan cleanup still needs broader native testing; no claim is made that these early failures establish a fixed storage fault.

### Native handoff follow-up

The restored QA A draft was subsequently submitted on the same clean QA APK:

- Open Android's library picker and cancel: edited title and amount remain unchanged.
- Rename the fixture `QA CAPTURE HANDOFF 20261020`, continue to the transaction form and save: the native completion screen appears.
- Authenticated server readback finds exactly one transaction with that title, amount **123456**, and exactly one linked receipt dated **2026-10-19** with an owner-scoped storage reference. This checks metadata/linkage, not an independent download/hash audit of the uploaded bytes.
- Choose **Xem hóa đơn**: the receipt opens with the expected merchant title. Android Back returns directly to Dashboard, not to the old capture/form stack.
- A local SQLite snapshot has zero capture rows for A after completion. Cold restart, wait for A's home and reopen capture: the camera appears, without resurrecting the completed image draft.

Artifacts: `.artifacts/roadmap-qa/capture-handoff/result.json`, its SQLite/WAL snapshot, and `emulator-5556-handoff-*.xml` / `before-picker.xml` / `after-picker.xml`. The synthetic QA transaction/receipt remains as a reproducible fixture; no real-user financial data was changed.

### Library replacement follow-up — 2026-10-21

On the QA-only Android package, select one library thumbnail and then a different thumbnail. Edit the replacement title to `QA LIBRARY REPLACED` and amount to `789012`; cold restart and reopen capture retains the replacement image reference/ciphertext hash and edited values. The previously managed image is no longer present after replacement commits. Opening the library again, force-stopping the app before selecting, and reopening also preserves the same prior draft/image. No transaction submitted in this matrix.

Artifact: `.artifacts/roadmap-qa/capture-library/result.json` and `emulator-5556-library-*.xml`. These are lifecycle assertions over two different native picker selections, not OCR accuracy or an independent decoded-image visual comparison. Early runs exposed misordered amount entry and were not counted as PASS; the shared input fix and accepted native evidence are in [NATIVE_MONEY_INPUT_TDD_20261021.md](NATIVE_MONEY_INPUT_TDD_20261021.md).

Force-stop-before-selection is **not** Android Activity destruction followed by return of a selected pending result. Still open: that `getPendingResultAsync` scenario, killing during image/OCR/metadata write, guest and A–B media switching, pending fallback job recovery, missing/corrupt image recovery, and bounded cleanup of image/cache orphans. The successful single submission does not prove lost-response/idempotent retry or completion-storage failure recovery. The journal stores fallback storage references but does not resume an unfinished server job after restart.

## Verification and release status

- Discovered mobile tests: **266/266 PASS**, no skips.
- Focused journal coverage: **100% lines / 91.43% branches / 94.74% functions**; not native adapter or whole-app coverage.
- Typecheck PASS; lint 0 errors / 23 existing warnings.
- Clean QA x86_64 build PASS, **38 seconds**, installed without clearing app data. Temporary credential-free QA write-error probe was removed from source before this build.
- Reviewed journal, native storage adapter, capture/transaction wiring and picker contract. Existing unrelated dirty worktree changes were preserved. These checks apply to the current working tree, not a claim that every historical UI/native dependency has been committed or that a clean-checkout release is ready.
- No new secret constants/debug logging in the added production source. This targeted check is not a full security audit.
- No push or public ARM64/landing update. Auth A–B–A and the remaining roadmap matrices retain their previous open status.
