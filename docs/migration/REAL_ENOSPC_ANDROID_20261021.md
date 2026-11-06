# Real Android storage exhaustion — 21 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Isolation / safety

Created a new, previously nonexistent AVD `Picket_QA_Disk_Fault_35`, Android 35 Play Store x86_64, port 5558. Primary QA emulator was closed only after its active tests completed; its app data and the production package were not cleared. New AVD uses only guest synthetic data.

Requested data size was 2 GiB, but the image produced an actual **6,228,115,456-byte** filesystem. Harness validates the exact AVD/package, total filesystem <=6 GiB, available bytes <=6 GiB, and host C: free space >12 GiB before filling. It writes only the exact QA-owned file `files/qa-part1-enospc-fill`, never a host filesystem or existing user-data directory. `finally` removes that single throwaway file on failure. No recursive deletion or user-photo deletion.

## Evidence

| Case | Result |
| --- | --- |
| Actual guest keepsake replacement while storage full | PASS `real-enospc-current/result.json`, `real-enospc-native-resumed.log`: actual native filesystem fill returns `No space left on device`; replacement save fails; full SQLite keepsake row and all prior encrypted photo hashes unchanged. Exact filler removed; cold restart renders old photo. No injected space exception. |
| Cold OCR photo decode with exhausted space | Corrected native rerun PASS `real-enospc-capture-cold-corrected/result.json`, `real-usable-space-cold-native.log`: actual ENOSPC before cold launch, editable original metadata, no preview, ciphertext unchanged; free exact filler then cold restart opens original photo. Screenshot reviewed. `lastanr` still points only to the old 23:05:43 failure, not a new ANR. Initial failure retained in `real-enospc-capture/last-anr.txt`; original ANR PNG was overwritten by the first rerun and is not presented as retained evidence. |
| Real restore call after storage exhaustion | PASS `real-enospc-capture-guard/result.json`, `real-usable-space-guard-rerun-native.log`: timing-only pause before real restore, actual available bytes **0**, real production guard throws `ENOSPC`. While still full the original title remains enabled/editable; no preview allocation, ciphertext hashes unchanged. After exact filler removal and cold restart the original photo reopens. `full-volume-editable.png` visually reviewed. No synthetic storage exception. |

The first picker harness looked up a media timestamp again after the provider refreshed and failed before filling. Corrected selection uses the visible, observed photo node directly. Resumed the same existing keepsake; no duplicate setup row. This failed setup is retained in `real-enospc-native.log`, not counted as a product failure or PASS.

This AVD is disposable test infrastructure, not the user's primary emulator. Deleting the filler is intentional and irreversible for zero-filled test bytes; no source, APK, receipt or keepsake image was removed. Source and public landing APK remain unchanged by this hardware fault exercise.

## Storage preflight TDD

RED `8e083fa`: five executed tests fail for the missing free-space guard and missing wiring before native photo-directory creation. GREEN `7f110f4`: capture persistence, capture preview restoration and keepsake writes check the existing Expo `Paths.availableDiskSpace` before allocating derived files. Invalid/unknown byte budgets fail closed with a recoverable `ENOSPC` error; successful preflight retains one MiB beyond the conservative write budget. It is not an atomic reservation: concurrent write failures still propagate through existing preservation/cleanup paths.

Native follow-up exposed a real SDK semantic mismatch: with Android `df` showing 0 available bytes, Expo 57.0.7 `Paths.availableDiskSpace` returned **145,620,992 bytes**. Installed `FileSystemModule.kt` uses `File.freeSpace`, which includes filesystem reserved blocks. This is not writable headroom for the app. The first corrected-build run showed no new ANR but still rendered the image; its harness failed the expected unavailable-image assertion and is **not** a full guard acceptance. A timing-only probe independently reproduced the mismatch before the real restore call; that failed precondition is retained, not relabelled as success.

Follow-up RED `0a81992`: tests require the existing `expo-file-system/legacy` `getFreeDiskStorageAsync` rather than raw `Paths.availableDiskSpace`. Its installed Android implementation reads `StatFs(Environment.getDataDirectory()).availableBlocksLong × blockSizeLong`, excluding reserved blocks. GREEN `b4e883a` adopts this installed API before all three writes, without a dependency or custom native module. `photo-usable-space-green.log`: 108 relevant tests PASS, same scoped coverage. A native timing-only probe pauses immediately before restore, fills the real guest filesystem, then records actual available bytes and delegates to the unmodified production storage function; it does not inject an error.

The first corrected probe reached the real `ENOSPC` but its `adb shell` XML export did not return the hierarchy, so the end-to-end run was not PASS. Switched only the harness to `adb exec-out uiautomator dump /dev/tty`, avoiding a disk file while storage is full. Complete rerun then passed all guards, editable metadata, exact hashes and cold image reopening. Failed harness log retained separately.

Final source suite after reserved-block correction: **415 mobile tests PASS**, zero failures/skips, `part1-usable-space-final-tests.log`. Internal x86_64 QA build: 83,746,740 bytes, SHA-256 `26cde180dd665f7aa566e2bc4a5f4bc95693146d2b32dff5857ae7eac633f5cd`, source `b4e883a`. Includes timing/measurement probes and must never replace the public ARM64 release.

`photo-space-green.log`: 107 OCR/keepsake tests PASS, zero failures/skips; photo-vault coverage 100% lines, 95% branches, 91.30% functions. Typecheck and lint hooks passed. Full discovered mobile suite: **414 PASS**, zero failures/skips, `part1-space-final-mobile-tests.log`. These source results do not close the Android ANR branch without its separate rerun.
