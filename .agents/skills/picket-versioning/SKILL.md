---
name: picket-versioning
description: "Quy chuẩn đặt version và tên bản build của Picket (app Android, AAB/APK, image Docker, thư mục release, git tag). Dùng mỗi khi tăng version, build bản cập nhật, deploy hoặc đặt tên artifact để mọi người và mọi agent đặt tên giống nhau."
---

# Quy chuẩn version Picket

Dựa trên Semantic Versioning (semver.org) và quy tắc versionCode của Android, khớp với cách dự án đang đặt tên từ 1.0.13 đến 1.0.18.

## 1. Version người dùng thấy: `MAJOR.MINOR.PATCH`
Đặt ở `apps/mobile/app.json` → `expo.version` (Gradle nhận qua prebuild thành `versionName`).

| Tăng | Khi nào | Ví dụ |
| --- | --- | --- |
| MAJOR | Thay đổi phá vỡ: bỏ tính năng, đổi định dạng dữ liệu/sao lưu không tương thích, bắt buộc đăng nhập lại | 1.4.2 → 2.0.0 |
| MINOR | Thêm tính năng người dùng thấy được (màn hình mới, thanh toán mới, hạn mức mới) | 1.0.18 → 1.1.0 |
| PATCH | Chỉ sửa lỗi, tối ưu, đổi chữ, cập nhật thư viện | 1.1.0 → 1.1.1 |

- Tăng MINOR thì PATCH về 0; tăng MAJOR thì MINOR và PATCH về 0.
- Không thêm hậu tố vào version phát hành (`-qa`, `-figma-merge` chỉ dùng cho bản QA, xem mục 3).
- Lịch sử: các bản 1.0.13 → 1.0.18 đều tăng PATCH dù có tính năng mới. **Từ bản sau 1.0.18 áp dụng đúng bảng trên** (bản kế tiếp có tính năng mới là 1.1.0).

## 2. `versionCode` (Android)
Đặt ở `apps/mobile/app.json` → `expo.android.versionCode`.
- Số nguyên, **tăng đúng 1 cho mỗi lần tải lên Google Play** hoặc phát hành APK landing, kể cả khi version giữ nguyên. Không bao giờ dùng lại hoặc giảm.
- Bản Play (AAB) và APK landing của **cùng một nguồn** dùng **cùng** version và versionCode (ví dụ 1.0.18 / 32).
- Trước khi tăng, đọc lại số lớn nhất đã có trên Play (`get_releases`) và trong `apps/landing/release.json`.

## 3. Bản QA (không phát hành)
- Gói `com.picket.mobile.bugqa`, versionCode cao cố định (mặc định 9000 trong `.agents/skills/picket-apk-testing/bugqa.init.gradle`) để luôn cài đè được bản QA cũ.
- `versionName` của QA có thể thêm hậu tố mô tả: `1.0.18-qa`, `1.1.0-qa-payos`.

## 4. Tên artifact trong `.artifacts/releases/`
```
picket-<version>-<versionCode>-google-play.aab
picket-<version>-<versionCode>-mapping.txt
picket-<version>-<versionCode>-gradle.log            (build Play)
picket-<version>-<versionCode>-direct-gradle.log     (build APK landing)
picket-<version>-<versionCode>-<YYYYMMDD>-<sha8>.apk (APK landing; sha8 = 8 ký tự đầu SHA-256 của APK)
picket-<version>-<versionCode>-build.json            (bản ghi build)
```
Bản QA: `picket-qa-<task>-<abi>.apk` (theo skill `picket-apk-testing`).

## 5. Image Docker và thư mục release trên VPS
- Tag image: `picket-<service>:<slug>-<YYYYMMDD>[-<git-sha8>]`, `service` ∈ `web`, `api`, `ocr-worker`, `ocr-provider`; `slug` là kebab-case ngắn của nội dung đợt deploy. Ví dụ: `picket-web:user-ui-20261111-e0602cfe`, `picket-api:finance-20261113`.
- Có git commit thì thêm `-<sha8>`; deploy từ cây làm việc chưa commit thì bỏ sha và ghi rõ trong `DEPLOYMENT.md`.
- Thư mục release VPS: `/opt/picket/releases/<phạm vi>-<YYYYMMDD>-<slug hoặc sha8>`; thư mục bằng chứng local tương ứng: `.artifacts/picket-prod-<YYYYMMDD>-<slug>/`.
- Luôn giữ image trước đó để rollback và ghi cả hai tag vào `DEPLOYMENT.md`.

## 6. Git
- Commit theo Conventional Commits có scope: `feat(billing): ...`, `fix(ocr): ...`, `chore(release): 1.1.0 (33)`.
- Khi phát hành: một commit `chore(release): <version> (<versionCode>)` chỉ đổi `app.json`, và tag `v<version>+<versionCode>` (ví dụ `v1.1.0+33`). Chỉ tạo commit/tag khi người dùng yêu cầu; không tự push.

## 7. Ghi chú phát hành
- Mỗi release Play có ghi chú `vi-VN` và `en-US`, mô tả điều người dùng thấy, tối đa 500 ký tự, không nhắc tên nội bộ.
- Bản landing và Play cùng versionCode dùng cùng nội dung ghi chú.

## Thứ tự khi phát hành một bản mới
1. Xác định loại thay đổi → chọn version theo mục 1; versionCode = số lớn nhất hiện có + 1.
2. Sửa `apps/mobile/app.json`, build theo `picket-play-release` (AAB) và build APK landing từ **cùng** nguồn.
3. Đặt tên artifact theo mục 4; deploy web/API (nếu có) đặt tag theo mục 5.
