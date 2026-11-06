# Plan: làm lại UI Web Admin theo Figma — 06/11/2026

Nhánh: `feat/admin-web-redesign` (từ `dev` @ `43cbba96`). Phạm vi: **chỉ `web/`** (admin + màn đăng ký/xác thực). **Không sửa mobile, không đổi API/DB.**

Nguồn design: Figma "Picket (Copy)" `cUjIA3BCaH0Ry80rvo5IbX`
- Trang **Admin Web** (`146:5765`): 24 màn / 7 nhóm.
- Trang **User Web** (`218:8871`): chỉ lấy section **01 · Đăng ký & xác thực** (W1 `218:8873`, W2 `218:8900`). Landing bỏ qua (đã xong).
- Ảnh xuất 1440×900: `.artifacts/figma-admin/png/` (local, không commit).

## 1. Hệ thiết kế (đo từ Figma)

| Token | Giá trị | Ghi chú |
|---|---|---|
| Nền trang | `#fff8ed` | trùng `--cream` hiện có |
| Thẻ | `#ffffff`, bóng `0 3px 10px rgb(48 33 51 / 7%)`, bo 24 | mép dưới răng cưa (như hoá đơn) ở thẻ KPI/bảng |
| Chữ | `#302132` chính, `#72636e` phụ | |
| Nhấn | `#793268` (sidebar, nút chính, tab chọn) | |
| Viền | `#eaddd5` 1px; gạch đứt `#eaddd5` 1.5px giữa hàng bảng | sidebar viền gạch đứt trắng 35% |
| Màu phụ | coral `#ffb4a2`, peach `#fde6d8`, mint `#bce0b4`, blue `#b8d8e2`, lilac `#ddcbe8`, kem `#fbebdd` | nền icon, ô lối tắt, chip gói |
| Trạng thái | thành công `#166534` / nền `#e8f5ef`; cảnh báo `#854d0e` / `#fff3cd`; lỗi `#9f2545` | chip bo 999 |
| Font | Nunito 600/700/800 | KPI 34–52px/800; tiêu đề trang 20px/800; nhãn nhóm 10–11px/800 UPPERCASE ls 1.1 |
| Bo góc | 999 (nút, chip, ô tìm), 12 (input, hàng), 24 (thẻ), 22 (sidebar) | |
| Khoảng cách | 8 / 12 / 24 | |
| Icon | nét 1.7px, trong ô vuông bo 12 có nền pastel | |

Tất cả trùng bảng màu Paper của landing v2 → dùng chung token, chỉ thêm font Nunito 600/800 (web đang có 400/700).

## 2. Khung chung (áp cho mọi màn admin)

- **Sidebar tím** 248px, bo 22, viền gạch đứt; logo + "Không gian quản trị"; mục "Tổng quan"; 5 nhóm thu gọn được (Khách hàng, Tăng trưởng, Vận hành, Nội dung, Hệ thống); mục đang chọn là "tab" kem nhô ra mép phải; thẻ "Bảo mật & MFA" + trạng thái MFA ở đáy.
- **Topbar**: breadcrumb "Picket / Quản trị" + tiêu đề trang; ô tìm "Tìm email, User ID…" (phím `/`); bộ chọn kỳ 7/30/90 ngày dạng segmented; chuông; menu tài khoản (avatar, tên, vai trò).
- **Thành phần dùng lại** (CSS mới `admin-paper.css` + vài component nhỏ trong `features/admin/ui/`): `KpiCard`, `PaperCard` (mép răng cưa), `DataTable` (header nền kem, hàng gạch đứt, avatar chữ cái), `StatusChip`, `FilterBar`, `SegmentedRange`, `SidePanel` (drawer phải, nền mờ), `EmptyState` (minh hoạ + 2 nút), `Banner` (chế độ đọc / sự cố), `ProgressBar`, `BarChart` (cột tím nhạt, cột cuối đậm), `Timeline`, `OtpInput` (6 ô).
- **Giữ nguyên hành vi**: mọi `<form action=…>`, `name` input, server action (`actions.ts`, `payment-actions.ts`), `requireApiSession`, `canViewAdminSection`, gọi `@picket/api-client`. Chỉ đổi markup/CSS.

## 3. Ánh xạ màn ↔ module

| # | Màn Figma | Route / component hiện tại | Việc |
|---|---|---|---|
| 01 | Admin · Đăng nhập | `/login` (dùng chung với user) | Biến thể admin của `AuthShell` (panel tím "Sổ tay vận hành", 2 thẻ số liệu) khi vào từ `/admin` (`next=/admin…`) |
| 02 | Nhập mã MFA | `mfa-panel.tsx` / bước AAL2 | Màn "Bước 2/2", `OtpInput` 6 ô, "Mã đổi sau Ns", "Dùng mã dự phòng" |
| 03 | Không đủ quyền | `canViewAdminSection` → hiện là 404/notice | `EmptyState` 403 + "Về Tổng quan" / "Yêu cầu quyền" |
| 04 | Lỗi tải dữ liệu | `app/admin/error.tsx` | `EmptyState` "Chưa tải được dữ liệu" + Thử lại / Xem sự cố |
| 05 | Chế độ đọc (chưa MFA) | trạng thái aal1 | `Banner` vàng "Bạn đang ở chế độ đọc" + nút "Xác minh MFA"; nút ghi bị khoá |
| 06 | Tổng quan | `admin-module` overview | KPI lớn + biểu đồ đăng ký, 4 KPI nhỏ, bảng "Tình trạng dịch vụ", cột "Lối tắt" |
| 07–08 | Người dùng / Chi tiết | users | `FilterBar` + `DataTable` + phân trang; chi tiết mở `SidePanel` (lịch sử tài khoản, cấp gói hỗ trợ có lý do, khoá tài khoản) |
| 09 | Truy cập & lượt tải | acquisition | 4 KPI, phễu ngang, biểu đồ phiên landing, bảng nguồn ngoài |
| 10 | Hoạt động ứng dụng | engagement | KPI DAU/WAU/MAU, bảng cohort D1/D7/D30, phân bố phiên bản, sự kiện 7 ngày |
| 11 | Hỗ trợ | tickets | Tab trạng thái có đếm, hộp thư bên trái, chi tiết + ghi chú nội bộ bên phải |
| 12 | Gói & thanh toán | billing | KPI gói, doanh số Google Play (cột chồng), cấp gói thủ công, bảng quyền mua đã xác minh |
| 13 | Nhận diện hoá đơn | ocr | KPI, bảng theo ngày, hạn mức nhà cung cấp, lỗi gần đây |
| 14 | Sức khoẻ hệ thống | health | Thẻ thành phần + dải uptime, hàng đợi worker, Android vitals |
| 15 | Sự cố | incidents | Banner sự cố đang mở, danh sách, diễn biến (timeline) + cập nhật |
| 16 | Phiên bản | releases (`release-admin.tsx`) | 3 thẻ phiên bản trạng thái, lịch sử phát hành, biên tập + review độc lập |
| 17 | Nội dung | content | Lưới bài học (thẻ màu), biên tập bài + review độc lập |
| 18 | Đối tác | partners | Thẻ ưu đãi đối tác có công tắc hiển thị |
| 19 | Nguồn dữ liệu | integrations | 4 thẻ nguồn + trạng thái, bảng lịch sử đồng bộ, "Chạy lại ngay" |
| 20 | Nhật ký hoạt động | audit | FilterBar + bảng audit + Xuất CSV |
| 21 | Nhân sự & quyền | staff (+ permissions) | Thẻ đếm theo vai trò, bảng thành viên, form cấp/thay vai trò (nhập SAVE) |
| 22 | Cấu hình ứng dụng | settings | Chế độ bảo trì, ngưỡng probe, thời hạn lưu, xác nhận thay đổi |
| 23 | Xuất báo cáo | exports | Form tạo CSV (chip loại dữ liệu, kỳ), danh sách báo cáo gần nhất |
| 24 | Bảo mật & MFA | security (`mfa-panel.tsx`) | Trạng thái MFA, thiết bị, phiên đăng nhập, QR + OTP |

## 4. Chức năng backend chưa có trong design → thiết kế thêm cùng phong cách

| Module | Đặt trong nhóm | Bố cục đề xuất (tái dùng thành phần ở mục 2) |
|---|---|---|
| **Doanh thu** (`revenue-admin.tsx`) | Khách hàng | Giống màn 12: KPI theo nguồn (Google Play / PayOS / tổng), biểu đồ cột chồng theo nguồn, bảng sổ doanh thu có lọc + Xuất CSV, `SidePanel` điều chỉnh/hoàn tiền (lý do + MFA) |
| **Thanh toán PayOS** (`payment-admin.tsx` – payments) | Khách hàng | KPI Đã thanh toán / Hết hạn / Đã huỷ / Cần xem; bảng đơn với chip trạng thái + đếm ngược hạn; `SidePanel` chi tiết đơn + "Đối soát lại" |
| **Ưu đãi** (`promotion-admin.tsx`) | Nội dung (cạnh Đối tác) | Thẻ ưu đãi giống màn 18 (công tắc hiển thị, % giảm, hạn, số suất) + form biên tập bên phải |
| **Thông báo hệ thống** (`announcement-admin.tsx`) | Vận hành (cạnh Sự cố) | Danh sách thông báo như màn 15 (chip loại: ưu đãi/sự cố/bảo trì), xem trước banner, form nhắm kênh/gói/phiên bản |
| **Phân quyền chi tiết** (permissions) | Hệ thống | Gộp vào màn 21 dạng tab "Thành viên / Quyền theo vai trò" (ma trận quyền) |

## 5. Đăng ký & xác thực (web user)

- **W1 Đăng ký bằng email**: panel tím "Tiền có chỗ…" + 2 thẻ số liệu; form email + mật khẩu + nhập lại, checklist độ mạnh mật khẩu (12 ký tự, hoa/thường, số, ký tự đặc biệt), "Tạo tài khoản", link chính sách, "Đã có tài khoản? Đăng nhập". Thay trang `/register` đang là "chưa sẵn sàng" bằng `register-form.tsx` (đã có sẵn) restyle theo W1.
- **W2 Nhập mã xác thực**: `OtpInput` 6 ô, "Gửi lại mã sau 0:45", "Đổi email", "Quay lại đăng nhập". Áp vào `/verify-email` (đang nhập 1 ô `token`).
- **Bổ sung (BE đã có, design chưa có)**: tab **"Email | Số điện thoại"** trên W1 dùng đúng khung form; W2 tái dùng cho OTP SĐT. Bật theo `GET /v1/auth/channels` (chỉ hiện SĐT khi backend bật).
- Đăng nhập user, quên/đặt lại mật khẩu: không có design riêng → chuyển sang cùng khung W1 cho đồng bộ (không thêm tính năng).

## 6. Thứ tự làm (mỗi bước test + chụp so với Figma)

1. **Nền tảng**: token + font Nunito 600/800, `admin-paper.css`, các component ở mục 2.
2. **Khung**: sidebar, topbar, menu tài khoản, bộ chọn kỳ (nếu backend chưa có tham số kỳ → hiển thị, mặc định 30 ngày).
3. **Trạng thái**: 01–05 (đăng nhập admin, MFA, 403, lỗi, chế độ đọc).
4. **Tổng quan + Người dùng** (06–08).
5. **Khách hàng & doanh thu** (11–12) + **Doanh thu, Thanh toán PayOS** (mục 4).
6. **Tăng trưởng** (09–10, 13).
7. **Vận hành** (14–16) + **Thông báo**.
8. **Nội dung & dữ liệu** (17–19) + **Ưu đãi**.
9. **Hệ thống** (20–24) + **Phân quyền**.
10. **Đăng ký & xác thực** (W1, W2, tab SĐT).
11. Rà responsive (1280 / 1440 / 1920 và tablet 768–1024: sidebar thu thành drawer), a11y (focus, contrast, aria), dọn CSS cũ không dùng.

## 7. Kiểm thử

- `npm run test:web`, `npm run lint`, `npm run typecheck`, `cd web && npm run build`.
- Cập nhật `web/test/compact-workspace.test.mjs` (đang kiểm `auth-card auth-card-compact`, `prefetch={true}`, "Mở menu tài khoản", `name="bell"`) theo markup mới, giữ ý nghĩa test.
- Chụp từng màn ở 1440×900 bằng Chrome headless với dữ liệu thật (tài khoản admin staging/production read-only) và đặt cạnh ảnh Figma để duyệt.
- Không deploy production cho tới khi bạn duyệt ảnh.

## 8. Điểm cần chốt

1. Số liệu chưa có API (ví dụ: biểu đồ đăng ký mỗi ngày, cohort D1/D7/D30, Android vitals, uptime dải, nhà cung cấp OCR): hiển thị **"Chưa có dữ liệu"** đúng khung design, không bịa số. Thêm API là việc riêng.
2. Bộ chọn kỳ 7/30/90 ngày và ô tìm toàn cục: làm UI + truyền tham số cho module nào API đã hỗ trợ; module khác bỏ qua tham số.
3. `/login` dùng chung: biến thể admin khi `next` trỏ về `/admin`.
