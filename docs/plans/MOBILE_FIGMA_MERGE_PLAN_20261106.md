# Plan merge `origin/refactor/redesign-landing-page` (mobile Figma) vào `feat/admin-web-redesign` — 06/11/2026

## 1. Nhánh nguồn có gì

- 14 commit mới (Camellya, 05–06/11) tính từ `acd2d1d2` (commit landing v2 đã merge trước đây), đầu nhánh `6857b070`.
- **Chỉ đổi giao diện mobile** theo Figma "Final UI": token và component dùng chung (`src/core/ui/figma-ui.tsx`), dock mới, Nhà, onboarding, đăng nhập, khoá app, picker, Chi tiêu C1–C9, Chụp hoá đơn D0–D5, Dự định E1–E3, Quản lý G1–G11, Tài khoản/Sao lưu/Giao diện/Bản thử, font Nunito (plugin `expo-font` trong `app.json`), kéo để làm mới, lướt trái.
- 99 file: 95 trong `apps/mobile/src`, cùng `apps/mobile/app.json`, `packages/design-tokens/src/index.ts` và `docs/migration/MOBILE_FIGMA_REDESIGN_20261106.md`.
- Lúc dừng, nhánh nguồn ghi `tsc` và lint sạch, mobile 1049 test pass. Nhánh hiện tại có 1105 test (thêm test i18n, OCR, học, SĐT).

## 2. Ảnh hưởng tới phần đã làm

| Khu vực | Nhánh nguồn đụng tới? | Kết luận |
|---|---|---|
| Web admin, web người dùng, đăng nhập/PIN (`web/`) | Không | Giữ nguyên 100% |
| Landing (`apps/landing/`) | Không | Giữ nguyên 100% |
| API, Supabase, worker, deploy | Không | Giữ nguyên |
| Mobile | Có, 13 file cả hai cùng sửa | 11 file conflict, 2 file tự merge |

Chạy thử bằng `git merge-tree` (không động vào thư mục làm việc): **11 conflict, toàn bộ trong mobile**.

| File | Bên mình | Bên Figma | Cách giải |
|---|---|---|---|
| `app/index.tsx` | +`AnnouncementBanner` | Nhà mới | Lấy bố cục Figma, gắn lại banner thông báo |
| `app/notifications.tsx` | +`AnnouncementInbox` | Thông báo mới, lướt trái | Lấy Figma, gắn lại hộp thông báo hệ thống |
| `app/profile.tsx` | +mục "Học tài chính" và "Kỷ niệm & giấy tờ" (cờ `featureFlags.learning`) | Tài khoản mới (xuất dữ liệu chuyển sang Sao lưu) | Lấy Figma, thêm 2 mục theo component Figma |
| `features/billing/payos-billing-screen.tsx` | Link 15 phút: đếm ngược, tự refresh, xác nhận thay link, mã ưu đãi | Giao diện G11 | Giữ toàn bộ logic PayOS của mình, áp markup/style Figma |
| `app/insights.tsx`, `keepsakes.tsx`, `receipts/[id].tsx`, `review-inbox.tsx`, `onboarding.tsx`, `learning-preview.tsx` | i18n: chuỗi bọc `t()`; học: danh sách bài lên trước | Markup mới | Lấy markup Figma, bọc lại `t()` cho mọi chuỗi; thêm bản EN cho chuỗi mới vào `common-resources.ts` |
| `app/settings-preview.tsx` | **Đã xoá** (mục chuyển vào Tài khoản) | Restyle "Bản thử" | Xem mục 4 |
| `app.json` | 1.0.16 / code 30 | Plugin `expo-font`, nền `#FFF8ED` | Tự merge; giữ cả version và font |

Nguyên tắc: **giao diện lấy theo nhánh Figma, chức năng giữ theo nhánh hiện tại** (thông báo, PayOS 15 phút, ưu đãi, SĐT, học, i18n, OCR).

## 3. Các bước

0. **Chuẩn bị:** thư mục làm việc đang có thay đổi web chưa commit (đã deploy: PIN, phiên hết hạn, tối ưu điều hướng, dọn code cũ). Cần **commit ở máy** trước khi merge để mỗi bước đều quay lại được. Chưa push.
1. Tạo nhánh làm việc `merge/mobile-figma` từ `feat/admin-web-redesign`, rồi `git merge --no-ff origin/refactor/redesign-landing-page`.
2. Giải 11 conflict theo bảng ở mục 2.
3. **Rà các màn mới của mình chưa có giao diện Figma** (không conflict nhưng sẽ lệch style): đăng ký SĐT `(auth)/register.tsx`, gắn SĐT `pending-phone-attach`, thông báo (`announcement-views`, `MaintenanceGate`), học tài chính, màn PayOS. Đổi sang component `figma-ui` và token mới để đồng bộ.
4. Kiểm tra:
   - Mobile: `npm run test:mobile`, gồm 1105 test bên mình và test mới bên Figma; `tsc`; lint; guard `routes-dir.test.ts` (không để test trong `src/app`).
   - Xác nhận `web/`, `apps/landing/`, `apps/api/`, `supabase/` **không đổi một byte** sau merge: `git diff feat/admin-web-redesign -- web apps/landing apps/api supabase` phải rỗng.
   - Web 64 test và landing 17 test chạy lại để chắc chắn.
   - Build APK QA `com.picket.mobile.bugqa` và chạy thử trên Redmi 7 (Nhà, Chi tiêu, Chụp hoá đơn, Tài khoản → Học tài chính, PayOS, thông báo). Đồng thời kiểm tra 2 việc nhánh Figma còn để lại: nút đáy bị bàn phím che, và font Nunito qua `expo-font`.
5. Bàn giao: commit merge ở máy (tác giả SonNPXSE183201). **Không push**, không upload Google Play cho tới khi bạn duyệt ảnh chụp trên Redmi.

## 4. Cần bạn quyết định

1. **Commit ở máy trước khi merge** (bước 0): cần thiết để merge an toàn và quay lại được. Vẫn không push.
2. **`settings-preview.tsx` ("Bản thử")**: bên mình đã xoá vì đã đưa Học tài chính và Kỷ niệm vào Tài khoản; bên Figma vẫn giữ và restyle. Đề xuất: **xoá** và dùng màn Tài khoản Figma. Hoặc giữ lại bản Figma nếu nhóm muốn có màn "Bản thử".
3. **Thay đổi hành vi bên Figma** (ghi trong tài liệu của họ), cần bạn đồng ý giữ:
   - Màn Chi tiêu mặc định chỉ hiện tháng hiện tại.
   - Khoá "Chuyển tiền" khi vượt số dư ví nguồn.
   - Gộp giao dịch trùng: "Gộp làm một" lưu trữ bản trùng, "Giữ cả hai" chỉ ẩn trong phiên.
   - Xuất dữ liệu chuyển từ Hồ sơ sang màn Sao lưu.
   - Chọn ngày phải bấm xác nhận.
