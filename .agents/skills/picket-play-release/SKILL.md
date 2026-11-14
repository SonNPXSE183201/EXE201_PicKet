---
name: picket-play-release
description: "Build bản Google Play (AAB) của Picket và cập nhật Internal testing / Closed testing đúng quy tắc, tránh các lỗi đã gặp (MCP hết thời gian chờ, httplib2 308, Chrome giới hạn 10 MB). Dùng khi phát hành bản mới lên Play."
---

# Phát hành Picket lên Google Play (internal + closed testing)

Quy tắc bắt buộc của chủ dự án:
- **Closed testing (`alpha`) chỉ được thêm bản mới** (versionCode lớn hơn). Không đóng track, không xóa/đổi tester hay quốc gia, không halt, không gỡ release. Làm sai sẽ reset bộ đếm 14 ngày.
- Thứ tự: build → **Internal** → cài từ Play lên Redmi 7 và thử → mới thêm vào **alpha**. Production không làm bằng skill này.
- Không bấm "Phát hành thay đổi" hay gửi duyệt production thay chủ tài khoản nếu chưa được yêu cầu rõ.

## 1. Build AAB (Windows)
1. Tăng `version` và `android.versionCode` trong `apps/mobile/app.json` (versionCode phải lớn hơn mọi bản đã tải lên).
2. Trong `apps/mobile`, PowerShell:
   ```powershell
   $env:PICKET_PLAY_BUILD='1'; $env:NODE_ENV='production'
   npm run release:preflight
   npx expo prebuild --platform android --no-install
   ```
   Kiểm tra `android/app/build.gradle` đúng versionCode và `android/gradle.properties` có `android.enableMinifyInReleaseBuilds=true` (plugin `with-release-shrinking`).
3. Build qua ổ `subst` trỏ vào **gốc dự án** (tránh lỗi đường dẫn > 260 ký tự, xem `picket-apk-testing`). **Không** dùng `bugqa.init.gradle` cho bản Play:
   ```powershell
   subst R: D:\EXE201\Project; cd R:\apps\mobile\android
   .\gradlew.bat :app:bundleRelease '-PreactNativeArchitectures=arm64-v8a,x86_64' -I ..\scripts\windows-release.init.gradle --no-daemon --max-workers=2 '-Pkotlin.compiler.execution.strategy=in-process' '-Dorg.gradle.jvmargs=-Xmx3072m -XX:MaxMetaspaceSize=1024m' --console=plain *> D:\EXE201\Project\.artifacts\releases\picket-<ver>-<code>-gradle.log
   subst R: /D
   ```
   Lần đầu khoảng 11 phút.
4. Chép `app/build/outputs/bundle/release/app-release.aab` thành `.artifacts/releases/picket-<ver>-<code>-google-play.aab` và `app/build/outputs/mapping/release/mapping.txt` thành `picket-<ver>-<code>-mapping.txt`.
5. Kiểm tra trước khi tải: `keytool -printcert -jarfile <aab>` phải ra SHA-256 upload `07:C0:43:46:FC:36:7A:7E:...`; AAB có `base/lib/arm64-v8a` và `base/lib/x86_64`; manifest đã gộp (`app/build/intermediates/merged_manifest/release/*/AndroidManifest.xml`) **không** có `REQUEST_INSTALL_PACKAGES`, `SYSTEM_ALERT_WINDOW`.

## 2. Tải lên Play bằng `play_release.py` (không upload bằng MCP)
Lỗi đã gặp ngày 14/11/2026:
- MCP `deploy_app` / `upload_bundle` báo `The read operation timed out` với AAB khoảng 67 MB và không commit gì. Luôn đọc lại bằng `get_releases` trước khi thử lại.
- Chrome `file_upload` chỉ nhận tệp dưới 10 MB nên không tải AAB qua Play Console được.
- Upload resumable qua httplib2 lỗi `RedirectMissingLocation` vì mã 308; script đã bỏ 308 khỏi `redirect_codes`.
- Thư viện Python cũ trong `.artifacts/.../play-deps` đã bị dọn; dùng virtualenv của Play MCP.

```powershell
$py="C:/Users/nguyen.son/.codex/tools/play-store-mcp/.venv/Scripts/python.exe"
& $py .agents/skills/picket-play-release/play_release.py internal --aab .artifacts/releases/picket-<ver>-<code>-google-play.aab --mapping .artifacts/releases/picket-<ver>-<code>-mapping.txt --code <code> --name "<ver> (<code>)" --notes-vi "..." --notes-en "..."
```
Sau đó đọc lại bằng MCP `get_releases` (chỉ đọc): internal phải là code mới, trạng thái `completed`.
- Nếu gặp lỗi "This edit has expired": đọc `get_releases` trước (thường chưa có gì được commit) rồi chạy lại. Nguyên nhân hay gặp là admin-worker trên VPS mở edit để đọc track Play mỗi 5 phút; tải AAB lâu (khoảng 3 phút) dễ trùng lúc đó.
- `completed` trên API chưa có nghĩa là tester nhận được bản mới: nếu bật managed publishing, máy chỉ thấy nút "Cập nhật" sau khi chủ tài khoản bấm "Phát hành thay đổi" ở "Tổng quan về việc xuất bản".

## 3. Thử bản Internal trên Redmi 7
- Cập nhật `com.picket.mobile` từ Play Store bằng tài khoản Google tester trên máy (không đụng gói QA `com.picket.mobile.bugqa`).
- Thử: mở app, chuyển tab, camera/OCR, màn hình gói (Play Billing chỉ mở bảng mua; không hoàn tất thanh toán nếu chưa chắc đó là license tester), thông báo. Đọc `adb logcat -b crash`.

## 4. Thêm vào Closed testing
Chỉ khi bước 3 đạt:
```powershell
& $py .agents/skills/picket-play-release/play_release.py alpha --code <code> --name "<ver> (<code>)" --notes-vi "..." --notes-en "..."
```
Script từ chối nếu alpha đã có code lớn hơn hoặc bằng code mới, và không động vào tester/quốc gia. Đọc lại bằng `get_releases`. Với managed publishing, thay đổi có thể chờ ở "Tổng quan về việc xuất bản" cho tới khi chủ tài khoản bấm "Phát hành thay đổi".
