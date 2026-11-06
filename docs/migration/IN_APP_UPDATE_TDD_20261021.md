# In-app Android updates and installed version — 21 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Public release update 22 October: [1.0.4/code5 ARM64](ANDROID_RELEASE_1_0_4_20261022.md) is now live; manifest/complete HTTPS download/checksum/Range verified. Production-config x86 in-place 1.0.3→1.0.4 retained the guest keepsake and shows installed footer. Physical phone/in-app upgrade acceptance remains in the phone checklist. Earlier QA candidate and 1.0.3 checkpoints below retain their original scope.

Current follow-up: [Part 1 execution](PART1_CURRENT_EXECUTION_20261021.md). A controlled QA candidate has completed actual download/native verification, unknown-source permission, Play Protect scan, Android install confirmation, restart/version footer and retained guest data. It is not a new public release. Updater effect reactivation fix is recorded separately as RED `9692d06` / GREEN `32c5577`; historical release gates below retain their original scope.

## Requested journeys

1. In Cá nhân, check for a newer APK, download it in Picket and open Android's update confirmation without visiting the landing page or uninstalling the app.
2. Always show the installed version/build at the bottom of the profile content, including offline use.
3. Handle no update, unavailable network, unsupported device, cancellation and install permission without reloading the profile or reporting success prematurely.

## Design and implementation

The existing cream/mauve/peach tokens, Surface, accessible buttons and section headings are retained. The updater has its own state; profile settings, authentication and financial data are not reset. No background download or forced update is added.

`PackageManager` supplies actual installed versionName/versionCode, package, SDK, supported ABIs and installation channel. The footer does not substitute the public server version for the installed version. Unsupported builds without the native module show an explicit unknown-version message rather than invented metadata.

The fixed public HTTPS `/release.json` contract is reused. Client policy validates its fields, exact download filename, package, ABI and versionCode, never offering an equal/older build. A Play-installed app is routed to Google Play instead of the sideload installer. No npm dependency was added: Expo File handles streaming download/progress/cancellation; a focused local Expo Android module handles native verification and installer/settings intents.

APK files live only in the dedicated private `cache/picket-updates` directory. Partial/failed files are not installed. SHA-256 and length are checked with a buffered native stream, avoiding a full APK transfer through JS memory. Archive package, newer/matching version, signing certificate, minimum SDK and ABI are checked; checks repeat before each installer intent. Signing rotation fails closed. Users are never advised to uninstall or disable Play Protect. The read-only FileProvider exposes only the update cache path and is not exported.

Permission settings and installation require explicit actions. Returning from settings rechecks permission but does not auto-install. Opening the installer is labeled as pending Android confirmation, not a successful app update. The actual new footer after app restart is the version evidence.

## TDD evidence

| Guarantee | Executed evidence | Result |
| --- | --- | --- |
| Trusted manifest, versionCode ordering, invalid fields/paths, ABI/SDK/package and Play channel | `app-update-policy.test.ts` | RED then PASS, 8 cases |
| Explicit download/settings/install, cancellation/disposal, duplicate taps and retry | `app-update-controller.test.ts` | RED then PASS, 8 cases |
| Profile entry/footer, loading/no-cache footer and persistent private native provider configuration | `app-update-screen.test.ts` | RED then PASS, 3 source-contract cases; not an Android interaction claim |
| Stream hash/length, truncation/extra data, package/version/signing/ABI and path confinement | `:picket-app-updates:testReleaseUnitTest` | Intended compile-time RED on missing verifier, then 6 JVM cases PASS |
| Existing mobile regressions | Every discovered `src/**/*.test.ts`, Node + tsx | 374 PASS, zero failures/skips; `app-update-final-all-mobile-tests.log` |
| Types/lint | `npm run typecheck`, `npm run lint` | PASS; lint zero errors, 24 existing warnings |

Policy/controller coverage: **98.86% lines, 91.58% branches, 97.06% functions** using Node coverage with `src/features/updates/app-update-*.ts`. This is not native Android UI or bridge coverage. Evidence lives under `.artifacts/roadmap-qa/app-update-*.log` and native JUnit XML.

RED checkpoints: `1a50f3c` (selection/UI contracts), `eab985b` (controller), `fcee3ce` (native verifier), `c7a2764` (installer double taps/effect reactivation). GREEN checkpoints include `9d9fe64`, `4e1cb99`, `0afa214`, `d7ed97d`. The first native setup attempt lacked Gradle versionName and was corrected before the intended compile-time RED; it is not counted as feature evidence. An initial duplicate-installer test awaited both unresolved operations incorrectly; the corrected reproducer asserts the duplicate count before resolving both operations, and its valid RED is in `app-update-concurrency-red-valid.log`.

## Build and native acceptance checkpoint

Source version is prepared as **1.0.3/code 4**. The final QA APK built successfully in 1m47s after the footer fixes (`70230e2`): 83,698,812 bytes, SHA-256 `10f09b1c447ff1ea356e3ecfead720adee40168a74dbf8c6b2c7d84f3b5d489b`. The earlier QA artifact predates those fixes and is not the acceptance artifact.

Native UI smoke passed on the isolated Android 35 emulator `Picket_QA_35` / `emulator-5556`, package `com.picket.mobile.qa`, without touching the real account or financial records:

- Native installed-version footer reads **Phiên bản 1.0.3 (4)**.
- Explicit check retrieves the real public release metadata. A QA package/x86_64 device is not offered an incompatible production ARM64 APK.
- In airplane mode, the error/retry control and installed version remain visible.
- At 150% font size, the update section, action and footer remain reachable and readable above the bottom navigation.

The screenshots `profile-footer.png`, `font-150.png` and `offline-retry.png` were visually reviewed. Evidence: `.artifacts/roadmap-qa/app-update-native-ui.log` and `app-update-native-ui/result.json`. An initial smoke attempt reached the login screen before it was ready; the readiness loop was corrected and a fresh full run passed. This does not count as a successful physical ARM64 download/permission/install journey, which remains unverified.

Footer loading/no-cache coverage has an additional RED checkpoint `ee816a7`, GREEN `39b4a2b`, and layout refinement `70230e2`. This feature increment has not been pushed or published; the public landing remains 1.0.2/code 3.

The local production ARM64 APK also built successfully in 5m08s: `.artifacts/releases/picket-1.0.3-production-arm64-v8a.apk`, 70,283,788 bytes, SHA-256 `83c4cb5c90ae029c80204102beb58bf16f660698ba8d9a1f0362944817e0891e`. Packaged metadata confirms `com.picket.mobile`, versionName `1.0.3`, versionCode `4`, minSdk 24, ARM64 only and no debuggable flag. APK signature verification succeeds with production certificate SHA-256 `07c04346fc367a7ea5c6c08f34704dd3e36e2db0d68bad6d0f722175e4568bce`, matching the retained 1.0.2 APK. This is a local bootstrap artifact, not a published release.

## Bootstrap and release operation

An already-installed 1.0.2 cannot acquire new native/UI code retroactively. It needs one initial in-place installation of the APK containing this updater, signed with the existing production key. After that, later updates start in Cá nhân; Android still asks for its normal confirmation. This is an APK updater, not silent installation or an Expo OTA deployment system.

For a future release, increase versionCode, sign the matching package with the existing key, verify the APK and update the existing landing release manifest/download. The app will use that manifest without backend changes. Current publication/physical-device limitations must not be removed merely because policy tests pass.

The current distribution is sideload APK. Before any Google Play submission, review/remove `REQUEST_INSTALL_PACKAGES` and use a dedicated Play build/update channel; detecting Play at runtime alone is not a Play policy approval.

Primary references: [Android update identity/signing requirements](https://developer.android.com/google/play/app-updates), [Android alternative distribution and permission](https://developer.android.com/distribute/marketing-tools/alternative-distribution), [PackageManager install permission](https://developer.android.com/reference/android/content/pm/PackageManager#canRequestPackageInstalls()), [Expo asynchronous native modules](https://docs.expo.dev/modules/module-api/).

## Authorized publication — 21 October 2026

After the implementation checkpoint above, the owner explicitly requested committing/pushing and updating the landing page. The 12 feature commits through `ccd1b8b` were pushed to `origin/feat/picket-platform-ocr`; release metadata was committed separately as `a44adfa`. No APK binary, credentials or generated build directory is committed.

The existing static landing was rebuilt against the exact production APK above. All 8 landing tests pass with 100% line/branch/function coverage of `src/release.mjs`. No page design, Next route or backend behavior was changed.

Live publication and verification PASS:

- Landing and `/release.json` advertise **1.0.3 / versionCode 4**.
- Immutable public download: `https://picket.51-79-207-154.sslip.io/downloads/picket-1.0.3-20261021-83c4cb5c-arm64.apk`.
- A complete HTTPS download matches **70,283,788 bytes** and SHA-256 `83c4cb5c90ae029c80204102beb58bf16f660698ba8d9a1f0362944817e0891e`.
- APK attachment MIME/disposition and HTTP 206 byte ranges pass. `/login` responds 200; API health is `ok`.
- Previous immutable APK remains available. Matching previous HTML/metadata backup is `/opt/picket/apps/landing/rollback/1.0.2-0a1edd17`.
- No container restart/recreation, database migration or authentication configuration change.

Evidence: `.artifacts/roadmap-qa/production-1.0.3-live-verification.json`. Existing implementation verification remains 374 mobile tests plus 6 native JVM tests, types PASS and lint zero errors/24 existing warnings. The focused update-source scan found no private-key blocks, secret-key pattern or console logging; this is not a full security audit. Physical ARM64 update installation remains unverified and is not implied by deployment success. Users on 1.0.2 still need the one-time in-place bootstrap installation described above.
