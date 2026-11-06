# Dọn workspace — 2026-10-18

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Đợt chuẩn bị commit và landing page

- Kết quả cuối đợt: build ARM64 mới ký/kiểm tra thành công rồi xóa thêm `picket-camera-calendar-arm64.apk` cũ. Giữ `picket-production-arm64.apk` (70.016.199 bytes) và `picket-completion-emulator.apk` mới nhất. Gradle clean lần đầu vướng lint JAR đang khóa; dừng daemon và chạy lại `clean --no-daemon` đạt. Workspace sau clean/build landing ~2,33 GiB, gồm bản phân phối ARM64 cần cho landing. Xem [LANDING_RELEASE_TDD.md](LANDING_RELEASE_TDD.md).
- Kiểm kê lại: khoảng 5,2 GiB logical file sizes; `apps` ~3,92 GiB, `web` ~0,52 GiB, `.git` ~0,38 GiB, `.artifacts` ~0,34 GiB. Không xóa source, dependencies dùng cho lint/typecheck, Next build, Dart tooling, env hoặc signing key.
- Xóa đúng hai APK phân phối cũ đã có bản thay thế: `picket-camera-calendar-emulator.apk` (72.053.403 bytes) và `picket-roadmap-qa-emulator.apk` (72.070.327 bytes). Các đường dẫn đã resolve dưới `.artifacts/ui-redesign`, không tracked. Có thể build lại từ source; không qua Thùng rác.
- Giữ `picket-completion-emulator.apk` mới nhất. Giữ ARM64 cũ tạm thời đến khi bản ARM64 mới được ký/kiểm tra để không mất bản dành cho điện thoại.
- Pre-commit snapshot: mobile 152 tests, web 3 tests + lint/typecheck/build, Dart 72 tests + format/analyze/build, SQL validation và OCR provider 3 tests đạt. Mobile lint còn 24 warnings đã có. OCR unittest chạy từ repo root ban đầu sai import path; chạy lại từ `services/ocr-provider` đạt.
- Yêu cầu người dùng: một file mỗi commit, thông điệp Conventional Commits tiếng Anh, push nhánh hiện tại; không đưa APK, auth fixtures, env hoặc key vào Git. Hook lint-staged được thay bằng cùng các full-snapshot quality gates ở trên cho loạt commit một-file, tránh chạy lại toàn bộ project hàng trăm lần. Không thay hook của repository.

## Nguyên nhân

Không phải source code chiếm hơn 10 GB: `apps/mobile/node_modules` có 8.029.117.338 bytes (~7,48 GiB), phần lớn là native build intermediates trong Worklets, Reanimated, Expo Modules Core, Screens và Gesture Handler. `apps/mobile/android` thêm 1.331.826.262 bytes (~1,24 GiB). Mỗi lần build nhiều ABI làm các file `.o`, `.so`, CMake và Gradle intermediates tăng trở lại.

## Đã thực hiện

- Kiểm kê file/thư mục trước khi xóa; kiểm tra native output không được Git theo dõi.
- Dừng daemon rồi chạy `apps/mobile/android/gradlew.bat clean --console=plain --max-workers=2`: thành công. Tác vụ clean của framework xóa build/intermediates của app và các dependency Android; không xóa source của thư viện.
- Sau clean, tổng file trong workspace là 2.412.704.302 bytes (~2,25 GiB, trước khi thêm báo cáo nhỏ này); mobile node_modules còn ~899,6 MiB, Android còn ~152,8 MiB. Đây là logical file sizes, không phải phép đo chính xác allocated disk size/hard links.
- APK build output trùng lặp đã bị clean; hai bản phân phối `.artifacts/ui-redesign/picket-camera-calendar-{arm64,emulator}.apk` giữ nguyên. SHA-256 sau dọn khớp trước dọn:
  - ARM64: `50282E53A1F5B4235E9BB78D56A91793AE0F34B36DE2F318BBBAD14EDEFA9428`
  - x86_64: `6D638E1A87337704D12389FDA252CE8B612549BB6B6D0F1725869AC96732B3EB`
- Giữ `.git`, source/test/docs, UI mẫu, DOCX, package lockfiles, node_modules thực, `.env`/key signing, native project config, Next `.next` và Dart API build/tooling. Không sửa production hay lịch sử Git.

## Tác động và duy trì

Cache/build vừa xóa không qua Thùng rác nhưng có thể tạo lại bằng build; lần build APK tiếp theo sẽ lâu hơn. APK đã cài trên máy ảo và dữ liệu tài khoản không bị tác động. Không cần native intermediates để commit/push: hook hiện chạy lint-staged, CI cài dependency và tự build từ source/lockfile. Giữ thư viện cài sẵn giúp các kiểm tra local tiếp tục chạy.

Sau khi build và sao chép APK mới vào thư mục phân phối, có thể chạy `gradlew.bat clean` để thu hồi dung lượng. Không chạy clean trong khi build APK khác. Không tự xóa `.git`, keystore, env, file backup người dùng hay cache dữ liệu ứng dụng. Không build native trở lại chỉ để xác minh một đợt dọn cache vì sẽ lập tức tái tạo các GB vừa xóa.

Kế hoạch hoàn thiện: [APP_COMPLETION_PLAN.md](APP_COMPLETION_PLAN.md).
