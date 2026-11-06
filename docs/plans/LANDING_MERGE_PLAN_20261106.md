# Plan merge `refactor/redesign-landing-page` vào `fix/mobile-completion-plan` — 06/11/2026

## Bối cảnh

- `refactor/redesign-landing-page` (commit `acd2d1d2`): landing v2, chỉ sửa `apps/landing`. Cùng base `f2a9da2a` với nhánh hiện tại.
- `fix/mobile-completion-plan` cũng sửa `apps/landing` trong đợt 4 (quản lý phiên bản):
  - `scripts/sync-release.mjs`: sinh `release.json` từ registry `GET /v1/releases/landing`.
  - `releaseFromRegistry` trong `src/release.mjs`, kèm test trong `test/release.test.mjs`.
  - script `sync:release` trong `package.json`.
- Mô phỏng bằng `git merge-tree`: chỉ có **một conflict ở `apps/landing/package.json`**; `src/release.mjs` tự merge được.

## Nguyên tắc

1. **Ưu tiên code của landing v2**:
   - Giữ nguyên `site/`, `paper-motion-v1.*`, `landing-r2.css`, asset v2, font, test `site.test.mjs`, README, `PLAY_STORE_URL`.
   - Khi conflict, lấy phía landing làm gốc.
2. Phần của nhánh hiện tại chỉ được **thêm vào**, không ghi đè: `sync:release`, `releaseFromRegistry`. Hai phần này không đụng giao diện.
3. Không đổi `release.json`, APK, track Google Play.

## Các bước

1. Merge (`--no-ff`) nhánh `origin/refactor/redesign-landing-page` vào nhánh hiện tại.
2. `package.json`: lấy bản landing (`dev`, `devDependencies.serve`) rồi thêm `sync:release`.
3. Rà `src/release.mjs` sau khi tự merge: token chữ thường của landing và `releaseFromRegistry` phải cùng tồn tại; `releaseFromRegistry` không được trả các khóa chỉ dùng cho render.
4. Rà các chỗ ngoài `site/` phụ thuộc nội dung landing:
   - `scripts/build.mjs`: copy thư mục `launch-assets/v2`, kiểm tra token.
   - `scripts/deploy.ps1`, `deploy/deploy-landing.py`: danh sách file được deploy.
   - `test/motion.test.mjs`: hiệu ứng cuộn đã bị bỏ.
   - Manifest phiên bản (`release_landing_manifest`): các token mà template mới dùng.
5. Kiểm thử:
   - `npm test --prefix apps/landing`.
   - Build thử bằng APK đã ký trong `.artifacts/releases` (nếu khớp `release.json`) vào thư mục tạm; kiểm tra output không còn `{{`.
   - Chạy test toàn repo phần bị ảnh hưởng (landing, web, mobile).
6. Sửa lỗi phát sinh. Nếu cần sửa, ưu tiên sửa phía nhánh hiện tại (script/test của đợt 4) thay vì sửa giao diện landing v2.
7. Cập nhật tài liệu tổng kết và push.

## Rủi ro

- `PLAY_STORE_URL = '#'`: nút Google Play chưa có đích. Chưa nối với registry; chỉ đổi khi Play mở công khai, vì closed testing không được động tới.
- Font và ảnh v2 làm landing nặng hơn khoảng 1,5 MB. Cần đo lại dung lượng trang sau khi deploy.
