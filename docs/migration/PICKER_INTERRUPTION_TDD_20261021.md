# Android interrupted image selection — 21 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Accepted behavior

The user explicitly selected: restore the previously saved draft and ask to select the image again when Android kills the process and does not deliver the new selection. Do not adopt an unowned pending native result or promise recovery of a result the OS never delivered. Activity recreation with an actually delivered image remains a separate previously accepted case.

## Implementation

Before launching the native image picker, persist an owner-scoped operation UUID in `picket-capture.db`. The marker contains no image, text, token or path. On capture restoration, read only the current owner's marker and keep its existing encrypted capture draft. Display an interrupted-selection explanation, including a separate message when no prior draft exists.

Ordinary completion/cancellation clears only the exact owner/operation pair after processing. A late old completion cannot remove a newer marker. If recording the marker fails, do not open the picker. No call to `getPendingResultAsync` blindly adopts a result after an owner change. The existing generation and mounted-owner checks remain in effect.

## Evidence

| Stage | Result |
| --- | --- |
| RED `f8bca16` | Five tests fail for missing persistent recovery store and capture wiring, `picker-interruption-red.log` |
| GREEN `bc61f83` | Actual SQLite store tests plus capture wiring; focused 60 tests PASS, `picker-interruption-green.log`; hook lint/typecheck PASS |
| Full suite | 401 PASS, zero failures/skips, `picker-interruption-full-tests.log` |
| Scoped coverage | `capture-journal.ts`: 98.90% lines, 92.16% branches, 93.33% functions, `picker-interruption-coverage.log`; not whole-app coverage |
| Lint/typecheck | PASS typecheck, zero lint errors/24 existing warnings |
| Native process-kill fallback | PASS `picker-interruption-current/result.json`, `picker-interruption-native-viewport.log`: actual same-UID SIGKILL while external picker open, different app process restores prior image, encrypted image bytes unchanged, interruption notice survives two cold starts. Ordinary picker cancellation clears its marker; next cold start shows the normal draft-restored notice. No financial mutation or adoption of undelivered image. |

Native QA build: x86_64/code 4, 83,754,976 bytes, SHA-256 `9ab9c0d58bad24346bfdb369c4e3c72046f7fb118c9cb6bc8e44533c68f8d849`. First harness did not scroll to the notice below the long form; it was stopped and rerun with viewport-aware notice discovery. No failed viewport run was relabelled PASS. New behavior was tested against the user's accepted fallback, not the earlier stronger guarantee of recovering an OS result that never arrived.

Owner extension PASS `picker-owner-fallback-current/result.json`, `picker-owner-fallback-native.log`: kill A with external picker open, log in generated B, B has neither A's photo nor A's interruption notice; return A restores its own marker/image and every encrypted photo file remains byte-identical. No undelivered native result is adopted, no financial mutation.

No API migration/deployment is required. Local RED/GREEN checkpoints are not pushed; public APK stays 1.0.3/code 4. A QA build containing internal fault adapters is not a production release.
