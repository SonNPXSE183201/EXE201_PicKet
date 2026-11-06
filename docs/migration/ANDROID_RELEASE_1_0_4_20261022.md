# Android production 1.0.4 — 22 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Published artifact

- Landing: https://picket.51-79-207-154.sslip.io/
- APK: https://picket.51-79-207-154.sslip.io/downloads/picket-1.0.4-20261022-ee02a076-arm64.apk
- Update manifest: https://picket.51-79-207-154.sslip.io/release.json
- Version **1.0.4**, versionCode **5**, package **`com.picket.mobile`**, ARM64, minSdk 24.
- **70,320,600 bytes**, SHA-256 **`ee02a07682fbcb8abfadf9605ae663c45a15398ce7d82e9412508ac740f18fc7`**.
- Signing certificate SHA-256 **`07c04346fc367a7ea5c6c08f34704dd3e36e2db0d68bad6d0f722175e4568bce`**, identical to previous public release. No debug signer/debuggable flag.

Includes the accepted follow-up source for owner-isolated auth recovery, picker interruption fallback, safe receipt attempt recovery UI, compact receipt previews/lazy full-photo loading, late-owner reminder cancellation and writable-space photo preflight. [Part 1 acceptance](PART1_ACCEPTANCE_20261022.md) preserves the case-by-case scope and historical failures.

Build input: committed source baseline `b4e883a` plus reviewed version-only configuration 1.0.4/code5 and the already reviewed test-title clarification. No uncommitted production behavior changes were added to build it. Version/configuration and documents are committed individually in this release task; build metadata's baseline hash alone is not presented as a clean-tree release tag.

## Verification performed

| Gate | Evidence and result |
| --- | --- |
| ARM64 build | PASS `release-1.0.4-arm64-build.log`; Kotlin daemon incremental compile fell back to non-daemon compilation, final build succeeded. No failed build is labelled successful before its final Gradle result. |
| Artifact inspection | PASS `production-1.0.4-verification.json`: exact package/version/ABI, same signing certificate, no debug flag/audio permission, public HTTPS API/Supabase, no QA timing/fault endpoints or server secret in bundle |
| Mobile | 415/415 tests, zero skip/fail; typecheck PASS; lint 0 errors/24 existing warnings |
| Landing | 8/8 tests PASS, build verifies exact APK bytes/hash before rendering download/manifest |
| Web | 3 auth tests PASS, lint/type generation/typecheck PASS; existing Node module-type warning retained |
| API | 82 tests PASS, analyzer no issues |
| Production-config emulator smoke | x86_64 nondebug package `com.picket.mobile`: installed old 1.0.3/code4 into previously absent package on QA AVD, created a guest keepsake, installed 1.0.4/code5 **in place**, observed same keepsake and footer `Phiên bản 1.0.4 (5)`. No uninstall/Clear data. `release-1.0.4-upgrade/result.json`, screenshot reviewed. Initial harness failed only because footer was offscreen; resumed same installed package/fixture, no reseeding or deletion. |
| Public HTTPS | PASS `production-1.0.4-live-verification.json`: complete downloaded bytes/checksum, attachment MIME, Range 206, rendered landing/manifest, login 200 and API health `ok` |

Emulator production-config artifact is **not** the public APK: x86_64, 72,387,676 bytes, SHA-256 `08208b0e3176f0a70f84a7a1daedb98edaf3370f9e561109232f575f5ff5ad4d`. It is used only for emulator smoke, not uploaded as the phone download. ARM64 physical-device smoke remains NOT RUN; follow the [detailed phone checklist](../ANDROID_REAL_DEVICE_CHECKLIST.md).

## Deployment and rollback

Uploaded an immutable download filename, verified on VPS, copied only landing assets/index/release metadata, kept prior immutable downloads, then replaced metadata using temporary files plus atomic rename. No API/web/OCR container recreation or backend migration in this publication.

- Previous landing metadata retained at `/opt/picket/apps/landing/rollback/1.0.3-83c4cb5c`.
- Staged artifact directory `/opt/picket/apps/landing/releases/1.0.4-ee02a076`.
- Rolling back landing metadata stops offering this build to users not yet updated; **it does not downgrade installed Android versionCode 5**. Do not uninstall or use forced downgrade flags on user data. A client fix after this release needs a higher versionCode and the same compatible signing key.
- Preserve receipt-attempt server fences from the separately approved API rollout; restoring old landing files is not authority to undo those migrations.

## Remaining acceptance / owner inputs

- Physical ARM64 phone camera/biometrics/notifications/upgrade/performance: [steps and expected results](../ANDROID_REAL_DEVICE_CHECKLIST.md).
- Google Play: user confirmed no Console account yet. [Registration → sandbox → production guide](../GOOGLE_PLAY_SANDBOX_TO_PRODUCTION.md); no Play AAB submission, real purchase or payment activation is claimed.
- Staff: [18 verified checks and explicit limitations](STAFF_ADMIN_ACCEPTANCE_20261022.md), including temporary role removal, new-account cleanup and two inactive ad fixtures pending owner SQL cleanup.
- Real Flutter backup input is still required for historical-export compatibility acceptance.

APK/build caches and credentials are not committed to Git. User requested one-file English Conventional Commits and push of reviewed source/docs/release metadata; Git result is verified separately, not inferred from publication.
