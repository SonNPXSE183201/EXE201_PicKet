---
name: picket-apk-testing
description: Build and retain Picket Android APKs for device or emulator testing with a separate QA package, one target ABI, verified backups, and cleanup of generated outputs. Use for test APK builds and repeated Android bug-fix builds, not publishing production APK/AAB releases.
---

# Picket test APK builds

Build only the APK needed for the current test. Keep one verified QA APK per active task/ABI, a compact build record, and the production version backups. Generated output and screenshots must not accumulate across attempts.

Resolve the repository root from Git; commands below use PowerShell. Read the current `AGENTS.md`, `apps/mobile/app.json`, `apps/mobile/android/app/build.gradle`, `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`, and `apps/mobile/scripts/windows-release.init.gradle` before choosing commands. Versions and installed toolchains can change.

## Choose the smallest useful build

- For parser, business logic, or TypeScript-only checks, run the focused tests first. Build an APK only when device/native behavior needs verification.
- Check `git status`, free space on C and the workspace drive, and existing Gradle/build processes. Never clean an output tree while another build is writing it. If space is insufficient, remove reviewed task artifacts/generated output first; do not start repeated failed builds.
- Select an explicit ADB serial and read its ABI with `adb -s <serial> shell getprop ro.product.cpu.abi`. Build only that ABI, normally `arm64-v8a` for the phone or `x86_64` for `Picket_QA_35`. Do not default to all four ABIs or create new AVDs for each task.
- Prefer `assembleDebug` for a Metro-connected development test; use `assembleRelease` when an offline/self-contained JS bundle is required. Build an AAB only when the task specifically tests bundle/Play behavior.
- Reuse the same Gradle wrapper, native tree and shared dependency cache across iterations. Do not create a new `GRADLE_USER_HOME`, SDK, node_modules copy, full checkout, or timestamped build directory for each retry.
- Do not use `scripts/build-releases.ps1` for ordinary QA: its current workflow builds production APK plus AAB, creates multiple APK copies, and contains fixed version/path values. Production publishing requires a separate task.

## Isolate the QA package

For real-device QA use **only `com.picket.mobile.bugqa`**. Never install over, uninstall, or clear `com.picket.mobile` to resolve a QA installation conflict.

The current native build defaults to production `applicationId`; a QA filename, debug signing key, or `PICKET_PLAY_BUILD=0` does not change it. Inspect for an existing supported QA variant/override. If none exists, prepare a narrowly scoped Gradle init override or temporary native configuration for the QA application ID and signing. Keep the production namespace/source packages compatible, check manifest authorities/deep links, and inspect the result. Do not pretend that a `-P` option changes the package unless the build script actually consumes it.

Keep task-specific overrides in `.artifacts/apk-qa-<task>/`. If temporary changes to tracked native/config files are unavoidable, preserve pre-existing edits and restore only your own changes after the build. Do not use `git checkout`, `reset`, or `expo prebuild --clean` to discard the user's work. Do not run prebuild for a JS-only change; use non-clean prebuild only when native config requires it, then review the diff.

Use the existing local environment/secrets. Do not print `.env`, key properties, keystore passwords, tokens, or signing credentials into logs.

## Run and verify

Use one task directory `.artifacts/apk-qa-<task>/` for the current log, manifest and temporary overrides. Reuse `build.log` rather than keeping every retry. Preserve the last useful failure log until the error is resolved.

Example command shape, **after** configuring and reviewing the QA package override:

```powershell
# Run from apps/mobile/android. Supply the reviewed QA override if no QA variant exists.
.\gradlew.bat :app:assembleRelease `
  '-PreactNativeArchitectures=arm64-v8a' `
  -I ..\scripts\windows-release.init.gradle `
  -I <reviewed-task-qa-override.init.gradle> `
  --no-daemon --max-workers=2 `
  '-Pkotlin.compiler.execution.strategy=in-process' --console=plain
```

Replace the ABI, task and init paths with inspected values. Check `$LASTEXITCODE` for every native command; when capturing a log through `Tee-Object`, check the native exit code too. Do not mark a build successful merely because the log pipeline returned.

Before installation:

1. Verify the APK signature using the installed `apksigner`; debug-signed QA is acceptable, production signing is not required for ordinary QA.
2. Use `apkanalyzer manifest application-id`, `version-name`, and `version-code`; confirm `com.picket.mobile.bugqa`. Inspect APK native libraries for the expected ABI. Record SHA-256 and byte size.
3. Save a single verified canonical backup as `.artifacts/releases/picket-qa-<task>-<abi>.apk` plus a small JSON record with package, versionName, versionCode, ABI, SHA-256, bytes, build task, Git HEAD, dirty-tree status, time and test target. A dirty source build must be recorded as dirty, not attributed to clean HEAD alone.
4. On another iteration, verify the new APK before replacing that task/ABI backup. Keep the previous good backup if build/validation fails. Do not create `r1`, `r2`, `latest2`, `followup`, timestamp or identical-hash copies. Keep multiple QA versions only when a specific upgrade/regression test needs them; remove the comparison copy after that test.
5. Install with `adb -s <serial> install -r <verified-qa-apk>`. If signatures conflict, diagnose the **QA** package only; do not clear data without authorization. Do not upload or publish as a side effect of QA.

Use `../picket-ocr-testing/SKILL.md` additionally when testing receipt images, the Bill corpus, or OCR behavior. Preserve corpus inputs and product assets.

## Finish each task without build debris

- After all builds and tests finish, copy/verify any new APK/AAB backups **before** deleting generated output. Run `npm run cleanup:generated` from the repository root, inspect its targets, then `npm run cleanup:generated:apply` when no other task is using those outputs. This script currently includes shared web/landing outputs: coordinate with active dev servers and skip broad cleanup while those outputs are in use.
- The cleanup script checks flat files in `.artifacts/releases` by SHA-256. If it stops for an intermediate AAB or old QA APK, create a temporary backup there, verify the hash, then rerun dry-run/apply. Once the intended signed release/QA backups are safe and the intermediate output is gone, remove the explicitly identified temporary backup. Do not retain unsigned/intermediary bundles as versioned production backups.
- Inspect local module outputs under `apps/mobile/modules/*/android/build`; the current root cleanup script does not cover these. Remove only exact generated paths after checking Git tracking, reparse points, and APK/AAB backups. Do not recursively delete the whole `modules`, `android`, `assets`, or `node_modules` directory.
- Store screenshots/recordings in the task directory, not `web/public`, `apps/mobile/assets`, or repository root. Delete temporary design/test captures after verification unless evidence was requested. Keep only the necessary failure evidence while unresolved.
- Preserve one signed production APK and one signed AAB per released version where available, the APK referenced by `apps/landing/release.json`, and requested upgrade-test versions. Never delete a production version based only on age, filename, or a QA hash match. Keep metadata that explains the retained binaries; deduplicate identical binaries by hash and update local references where necessary.
- Do not wipe global Gradle/Maven/npm caches after every build: this forces downloads/transforms to regenerate. At task completion measure their growth; if storage pressure requires pruning, inspect the version/task ownership, stop only idle Gradle daemons through the matching Gradle CLI, and remove reviewed cache targets. Leave IDE-locked files in place. Preserve wrapper distributions, JDKs, SDK/NDK, AVDs, signing keys, application profiles and Windows system files.
- Resolve every delete target to an absolute path within its named allowed root. Refuse tracked source files and linked trees. Never stop unrelated IDE/application processes to force cleanup.
- Report the canonical QA APK path/hash/package/ABI, focused checks, cleanup result, remaining retained outputs and any busy files. Compare final Git status with the initial state; do not stage/commit generated artifacts.

## Lỗi build đã gặp trên Windows và cách tránh (cập nhật 13/11/2026)

Ghi từ các lần build `assembleDebug` arm64 cho Redmi 7. Đọc phần này **trước khi** build để khỏi mất ~18 phút cho một lần thất bại.

### 1. `ninja: error: Stat(...rngesturehandler_codegen...)` — đường dẫn quá 260 ký tự
- Triệu chứng: `Execution failed for task ':app:buildCMakeDebug[arm64-v8a]'`, ninja báo lỗi `Stat(...)` với đường dẫn rất dài trong `app/.cxx/...` và `node_modules/react-native-gesture-handler/...`.
- Nguyên nhân: giới hạn MAX_PATH của Windows khi biên dịch C++ (CMake codegen). Không phải lỗi code.
- Cách tránh: build từ một ổ ngắn trỏ vào **thư mục gốc dự án** (xem mục "Chạy build qua ổ ngắn"). Không bật LongPaths trong registry (đó là thay đổi cài đặt hệ thống, cần người dùng cho phép).

### 2. `A problem occurred evaluating settings 'android'. Process 'command 'cmd'' finished with non-zero exit value 1`
- Nguyên nhân: đã `subst` ổ ngắn trỏ vào `apps/mobile`. Khi đó gradle không còn thấy `node_modules` ở gốc monorepo nên bước phân giải module (autolinking) chạy `node` thất bại.
- Cách tránh: **luôn `subst` thư mục gốc `D:\EXE201\Project`**, rồi build từ `<ổ>:\apps\mobile\android`. Không `subst` riêng `apps/mobile`.

### 3. Gói QA
- `applicationId` mặc định là `com.picket.mobile`. Dùng file `bugqa.init.gradle` cùng thư mục skill này (`-I <đường-dẫn>\bugqa.init.gradle`) để đổi thành `com.picket.mobile.bugqa`. Không dùng `-P` vì build script không đọc.
- `scheme` deep link vẫn là `com.picket.mobile` ở cả hai gói; máy có cả hai gói có thể hiện hộp chọn ứng dụng khi quay về từ trình duyệt.

### Chạy build qua ổ ngắn (lệnh đã dùng)
```powershell
$used=(Get-PSDrive -PSProvider FileSystem).Name
$letter=('R','S','T','U','V','W','X','Y','Z' | Where-Object {$_ -notin $used})[0]
subst "${letter}:" D:\EXE201\Project            # ánh xạ GỐC dự án
cd "${letter}:\apps\mobile\android"
.\gradlew.bat :app:assembleDebug '-PreactNativeArchitectures=arm64-v8a' `
  -I ..\scripts\windows-release.init.gradle `
  -I D:\EXE201\Project\.agents\skills\picket-apk-testing\bugqa.init.gradle `
  --no-daemon --max-workers=2 '-Pkotlin.compiler.execution.strategy=in-process' --console=plain *> D:\EXE201\Project\.artifacts\apk-qa-<task>\build.log
"EXIT=$LASTEXITCODE" | Add-Content D:\EXE201\Project\.artifacts\apk-qa-<task>\build.log
subst "${letter}:" /D                            # gỡ ổ sau khi build xong
```
- APK debug nằm ở `apps/mobile/android/app/build/outputs/apk/debug/`. Lần đầu build mất ~18 phút; lần sau nhanh hơn nhiều nhờ cache.

### Việc không được làm khi đang build
- Không chạy `git stash`, `git checkout`, đổi nhánh hay sửa file dưới `apps/mobile/android`, `apps/mobile/modules` trong lúc Gradle chạy nền: file nguồn bị thay đổi giữa chừng có thể làm hỏng build hoặc cache.
- Không chạy thêm bản build thứ hai song song; mỗi `--no-daemon` tự fork JVM rất tốn RAM.
- Lỗi ở lệnh nền chỉ hiện khi tác vụ kết thúc; xem `build.log` (và giữ lại `build-failed-*.log` đến khi lỗi được xử lý).

### Dev client: xem UI không cần build lại
Sau khi cài bản debug QA một lần: `adb reverse tcp:8081 tcp:8081`, chạy `npm run start` trong `apps/mobile`, mở app trên máy. Chỉ build lại khi thêm thư viện có phần native.

### Đã xác nhận chạy được (13/11/2026)
- `subst` **thư mục gốc** + `bugqa.init.gradle`: `assembleDebug` arm64 thành công (lần đầu ~5,5 phút sau khi cache; build lại ~1,5 phút).
- `INSTALL_FAILED_VERSION_DOWNGRADE`: gói QA cũ trên máy có versionCode cao (62). `bugqa.init.gradle` đặt versionCode 9000 (đổi bằng `-PqaVersionCode=<số>`).
- `INSTALL_FAILED_UPDATE_INCOMPATIBLE` (chữ ký khác): bản QA cũ ký bằng khóa release cục bộ, nên override ký bản debug bằng khóa release khi có `key.properties`. Cài `adb install -r` thành công, không phải gỡ gói hay xóa dữ liệu.
- Mở dev client: `adb reverse tcp:8081 tcp:8081`, `npx expo start --dev-client --port 8081`, rồi `adb shell am start -a android.intent.action.VIEW -d "com.picket.mobile://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.picket.mobile.bugqa` (ghi rõ gói để tránh hộp chọn app).
