# Android production release 1.0.2 — 21 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Publication is explicitly authorized by the user. It is not a certificate that all remaining roadmap acceptance cases are complete.

## Verified artifact

- Package: `com.picket.mobile`; version `1.0.2`, versionCode `3`.
- ABI: only `arm64-v8a`; minimum Android SDK 24; not debuggable.
- Bytes: `70,246,540`.
- SHA-256: `0a1edd1780c54507e27afd7ec6365b2da28d624f73d10085c71992985c305599`.
- Immutable public filename: `picket-1.0.2-20261021-0a1edd17-arm64.apk`.
- Signing certificate SHA-256: `07c04346fc367a7ea5c6c08f34704dd3e36e2db0d68bad6d0f722175e4568bce`, matching the previous production APK.
- Embedded API is the public production HTTPS endpoint; QA proxy URL and the configured server secret are absent from the bundle. No microphone permission is present.
- Physical ARM64 phone smoke testing has **not** been performed in this release increment.

## Gates actually run

- ARM64 release build: PASS, 13m 22s, 871 tasks; `production-1.0.2-build.log`. Kotlin incremental cache failures fell back to non-daemon compilation; final build succeeded.
- APK signature, identity, ABI and embedded configuration checks: PASS, `production-1.0.2-verification.json`. An initial harness assertion expected `sdkVersion`, whereas this aapt2 prints `minSdkVersion`; corrected parsing verified the actual value 24 without changing the artifact.
- Mobile: 355 PASS, zero failures/skips; `release-1.0.2-mobile-tests.log`.
- Mobile lint: zero errors, 24 warnings; typecheck PASS. Per-file code commits retain the project lint/typecheck hooks.
- Dart API: 79 PASS; analyzer reports no issues.
- Web auth tests, lint and typecheck: PASS. Existing Next output/dependencies are retained.
- SQL functional suite: PASS, including OCR retention and Partner effective periods. Previously deployed migrations are not rerun by APK publication.
- Landing: 8 PASS; release-policy line/branch/function coverage 100%; build accepted the exact APK size/hash.
- Hook configuration tests: PASS.

## Publication and cleanup status

Live HTTPS deployment PASS on 21 October: landing metadata and HTML advertise the new immutable filename; the complete downloaded APK matches the approved byte count and SHA-256. MIME/disposition, HTTP 206 byte ranges, existing `/login` and API health all pass. Evidence: `production-1.0.2-publish.log` and `production-1.0.2-live-verification.json`. No containers were restarted or recreated. Previous immutable download and matching metadata remain available for rollback.

GitHub push PASS to `origin/feat/picket-platform-ocr`; the first publication push reached `bdd2aa8`. Every new commit from the original task checkpoint through publication was checked to contain exactly one file, with English conventional subjects and enabled hooks. Subsequent documentation-only updates are committed separately as well.

Post-push cleanup PASS: removed six obsolete local APK copies and the old landing checksum, totaling **458,512,810 bytes** (about 458.5 MB / 437.3 MiB). Exact removed paths and hashes are recorded in `.artifacts/roadmap-qa/release-cleanup-results.json`. Files were deleted from disk, not moved to trash; old QA binaries require a rebuild if needed. The previous production download remains on the VPS for rollback and cached links. Retained the latest signed ARM64 APK, latest x86_64 QA APK, current distribution/build outputs, evidence, lockfiles, dependencies, Next/typecheck outputs, Gradle tooling and Husky/lint-staged configuration. No dependency tree, signing material or source was deleted.

APK, signing files, environment files and generated build distributions are excluded from source commits. File-by-file English conventional commits preserve the implementation and QA reports. Existing open cases remain in `PART12_ACCEPTANCE_MATRIX_20261021.md`, including full natural-expiry A–B–A, Google cold callback, expanded media/camera faults, cache performance and Partner native acceptance.
