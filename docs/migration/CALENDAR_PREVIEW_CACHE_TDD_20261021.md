# Compact calendar previews — 21 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Reproduction

The prior thumbnail renderer bounded cell image dimensions but gallery hydration still loaded/decrypted the full encrypted receipt-image cache at startup (over 27 million ciphertext characters in the generated-owner fixture). Small cells did not eliminate that large bridge/cache read. Earlier emulator benchmarks and jank failures remain valid failures, not retrospectively relabelled.

## Change

- Keep a separate owner-scoped encrypted `receipt-thumbnails` cache, bounded to 2 MiB of preview strings and 131,104 characters per JPEG data URI.
- Hydrate calendar previews by exact storage path, not receipt ID alone; old-path previews cannot attach to a replacement image.
- Publish metadata/previews first. When every monthly receipt already has a preview, return without reading the full image cache.
- Persist compact previews incrementally so a restart does not discard all completed thumbnail work. Full offline image bytes remain in the original cache.
- Mount a full-photo loader only for the selected day's open sheet. It checks the owner namespace, reads the full offline cache then falls back to a signed URL. Unmount/owner change cancels stale view updates. Guest images still use their existing local source.

## TDD / verification

| Gate | Evidence / result |
| --- | --- |
| RED `3b888ac` | Four tests fail for missing compact preview index, eager full-cache read and missing lazy viewer, `calendar-preview-red.log`. A test-only TypeScript property access was corrected before the checkpoint; hooks passed. |
| GREEN `266e3e3` | Preview policy/receipt tests 31 PASS, typecheck and hook lint PASS. First commit attempt was correctly blocked by effect-state lint; fixed asynchronous image-resolution handling and reran without bypass. |
| Full suite | 409 tests PASS, zero failures/skips, `calendar-preview-final-tests.log` |
| Android functional | PASS 50-preview warm-up and preview-only completion; offline cold calendar then open retained full-size day-28 photo PASS (`calendar-preview-offline/result.json`, `calendar-preview-offline-utf8.log`). Actual screenshot `observed-photo.png` reviewed: distinct noise fixture and second same-day image render, not just accessibility labels. First harness report serialization failed on CP1252 Vietnamese text; rerun used UTF-8, same fixtures/no mutations. |
| Performance | Five cold metadata runs below declared 20-second bound; smoothness still OPEN as detailed below. No 60fps claim inferred from source tests. |

Native warm-up completed: 50 metadata rows/50 previews, 42,306ms inside the full first hydration (`calendar-preview-warm/result.json`), not a cold fast-path benchmark. Encrypted compact cache is 274,200 characters versus 27,454,780 for full photos. Subsequent real loader completion events report 50 previews and **zero full URI rows**, consistent with the preview-only branch. Five-run cold measurements/offline viewer remain separate acceptance; this does not certify 60fps.

Five subsequent cold probes completed (`calendar-preview-cold-probe/results.json`): host launch→first metadata **12.052, 10.058, 10.795, 10.476, 10.687 seconds**; gallery-only first metadata **1,218–1,880ms**. This is below the prior declared 20-second host harness bound on every run. Last run gfxinfo still reports **83/122 janky frames, P95 150ms** on SwiftShader; smoothness remains OPEN. A smaller cache/fast-path proof is not a claim of 60fps or a controlled causal comparison against a different GPU environment.

Host-GPU follow-up (`-gpu host -feature -Vulkan`) uses the same QA source/data, not a new source fix. First launch after emulator boot took **24.449s**, exceeding the host bound; retained as a failed bound sample. A separate five-run settled-host series (`calendar-preview-host-gpu-settled/results.json`) measured **10.793, 9.316, 8.641, 8.900, 7.839s** to metadata. Gfxinfo jank percentages were **12.10/6.15/10.12/9.27/5.56%**; P95 **250/42/44/48/42ms**. This separates renderer/system-startup effects from large-cache loading but does not certify stable 60fps or erase the initial boot-related failure.

Measurement hygiene: a live sequential DB/WAL copy produced a malformed **local snapshot** during writes; this was not diagnosed as app DB corruption or restored over app data. The harness now force-stops QA before cache-size snapshot and copies DB/WAL into a new unique folder without a stale SHM file. Failed snapshot evidence is retained as invalid measurement.

Direct production HTTPS API follow-up (no fault proxy), `calendar-direct-api-cold-probe/results.json`: five cold metadata results **8.169, 8.845, 8.394, 7.083, 7.727 seconds**; gallery-only **908–1,786ms**. Same distinct private QA image fixture. Last gfxinfo sample 15/201 janky frames (7.46%), P95 61ms; first sample 18/211 (8.53%), P95 48ms. This distinguishes the normal API transport from the earlier fault-proxy runs; startup/frame diagnostics do not prove steady-state interaction smoothness or a universal 60fps guarantee. The QA build uses only non-blocking measurement instrumentation, never the public ARM64 release.

No backend change or migration. Public APK/landing stays unchanged; local QA builds contain instrumentation, never release them as production APKs.

## Release-like QA measurement — 22 October 2026

**Final scoped acceptance PASS:** cold load, actual steady-state gestures and first postboot UI all have separate completed evidence. Earlier OPEN statements above describe their own diagnostic checkpoints, not the current result. [Final acceptance](PART1_ACCEPTANCE_20261022.md).

The ordinary isolated QA APK is explicitly debuggable for `run-as` fault inspection and is not a production-performance artifact. Built the same source `b4e883a`/same package and data with debuggability disabled; actual `dumpsys package` confirms no `DEBUGGABLE` flag. API/Auth/Storage retain normal HTTPS origins, only internal timing probes remain. Artifact: 72,395,568 bytes, SHA-256 `7bd332beecde0c58bf30117aa6fdd5c493051b3da92d2a244de5b85739fd5a7f`. It is still an isolated x86_64 QA package, not a public release.

- `calendar-nondebug-settled/results.json`: five cold launches **3.310, 2.448, 2.476, 1.914, 2.204 seconds** to first 50-row calendar metadata; gallery-only 247–406ms. The encrypted full-photo cache was audited before nondebug installation: 27,454,780 characters, compact previews 274,200 characters. Nondebug cannot use `run-as`; no false fresh cache audit is claimed.
- `calendar-nondebug-steady/results.json`: three batches of twelve real Android scroll gestures, **120/120/118** recorded frames; P95 **18.05/26.21/18.21ms**, max **18.91/35.13/18.99ms**, no frame >100ms. Calendar still enabled after gestures. Startup frames excluded from this steady-state measurement; no universal 60fps claim.
- The first postboot telemetry run failed to receive both event types, although direct UI inspection reached the correct generated-owner Dashboard. It is an invalid instrumentation result, not a startup PASS. Raw log retained in `calendar-nondebug-postboot.log`; direct postboot UI acceptance is tracked separately.
- Corrected direct postboot UI PASS `calendar-nondebug-postboot-ui/result.json`, `calendar-nondebug-postboot-ui-viewport.log`: wait for changed kernel boot ID and `sys.boot_completed=1`, first cold launch, scroll the observed calendar viewport, confirm day 28 enabled and tap it to open actual multi-receipt sheet. **16.185s** launch→enabled calendar including UI dumps/scroll, below the pre-existing 20s harness bound. Screenshot reviewed for sheet opening only; full-photo rendering/offline is separately tested. Initial direct-UI attempts raced reboot readiness or looked for an offscreen day; those failed harness logs are retained, not product acceptance.
- Two initial performance-build attempts failed in QA Gradle init configuration (included-build null project, then finalized debuggability). Fixed tooling to set a QA-only property during normal project evaluation; successful build `calendar-nondebug-native-build-final.log`. No production Gradle source was changed for this diagnostic.

Earlier debug/SwiftShader measurements, including 24.449/26.228-second first-after-boot samples, remain historical diagnostics. They are not relabelled as successful production measurements or used for a controlled causal speedup claim.
