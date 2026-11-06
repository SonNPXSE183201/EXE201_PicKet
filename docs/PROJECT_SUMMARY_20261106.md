# Tổng kết toàn bộ dự án Picket — 06/11/2026

Nhánh `fix/mobile-completion-plan`, **chưa push lên GitHub** (theo yêu cầu). Commit dùng tài khoản XitrumSon. Plan: [PICKET_MASTER_PLAN_20261105.md](plans/PICKET_MASTER_PLAN_20261105.md).

## 1. Đã xong

### Đã chạy trên production (API/web/worker/DB, test đạt trước khi deploy)

| Hạng mục | Nội dung | Báo cáo |
| --- | --- | --- |
| PayOS 15 phút | `expiredAt = now + 900`; mua lại thì hủy link cũ; GET trước khi hủy/hết hạn; tiền vào trễ vẫn mở gói; doanh thu chỉ tính đơn đã thanh toán; worker đối soát mỗi 60 giây | [PAYOS_EXPIRY_DEPLOYMENT](PAYOS_EXPIRY_DEPLOYMENT_20261105.md) |
| Sổ doanh thu | Gộp Google Play + PayOS, phân biệt nguồn, truy vết từng khoản, CSV, hoàn tiền/điều chỉnh cần MFA; nguồn có thể bật/tắt | [REVENUE_PROMO_NOTICE_RELEASE](REVENUE_PROMO_NOTICE_RELEASE_DEPLOYMENT_20261105.md) |
| Ưu đãi | Thêm/sửa/tạm dừng, đổi %, giới hạn suất, giới hạn mỗi người, mã ưu đãi; giá được khóa vào đơn | như trên |
| Thông báo hệ thống | Ưu đãi/sự cố/bảo trì (có thể chặn app); nhắm theo kênh, gói, phiên bản; VI/EN | như trên |
| Quản lý phiên bản | Google Play (chỉ đọc, không động closed testing), APKPure, landing; manifest sinh từ registry; phiên bản tối thiểu bắt buộc | như trên |
| Đăng ký/đăng nhập | Email hoặc SĐT + email; OTP qua Gmail (SMTP của Supabase); đăng nhập SĐT qua API; SMS chỉ cần cấu hình `OTP_CHANNELS`, `OTP_SMS_PROVIDER` | commit `c012fb13` |
| Đáp án học tài chính | Đáp án server cho bài 13–30 (migration `20261106010000`); test đảm bảo khớp nội dung app | commit `fa1599ed` |

### Đã code và kiểm tra, chờ phát hành mobile

- Giáo trình 30 bài, 4 chặng, VI/EN, có nguồn chính thức, đã tự duyệt theo checklist. Danh sách bài hiện ngay đầu màn hình.
- Mục "Học tài chính" và "Kỷ niệm & giấy tờ" trong trang Cá nhân; màn đăng ký mới; banner/hộp thông báo; màn bảo trì; cờ bắt buộc cập nhật.
- OCR: parser tổng quát hơn với 12 test mới (241 test OCR). Chạy đủ 40 ảnh Bill trên Redmi 7 bằng bản QA code 61: **40/40 xử lý được, 0 lỗi, 15 ảnh đủ điều kiện mở màn Review tự động**. Output ML Kit gốc lưu ở `.artifacts/ocr-device-20261106/results/` để đánh giá offline.
- i18n: review-inbox, insights, onboarding, keepsakes, chi tiết hóa đơn, thông báo lỗi API (thêm 131 khóa EN, có test locale).
- OCR replay 40 ảnh Bill (output ML Kit thật từ Redmi) so với parser cũ: tổng đúng 25 / sai 0 / thiếu 11 (giữ nguyên, **0 hồi quy** sau commit `10615dde`); ngày đúng 10 → 11; dòng hàng P/R 75,8% / 20,7%. Chi tiết: `.artifacts/ocr-device-20261106/EVALUATION.md`.
- Sửa lỗi gom ngày theo UTC trong dữ liệu dự báo.

### QA thiết bị thật (Redmi 7, `com.picket.mobile.bugqa`)

| Kiểm tra | Kết quả |
| --- | --- |
| Cài đè code 59 → 60 → 61, giữ phiên và dữ liệu | PASS; app production `com.picket.mobile` vẫn code 28, không bị đụng |
| Trang chủ, thông báo (feed rỗng), Cá nhân, phiên bản app | PASS |
| Học tài chính | 2 bug đã sửa: câu "đang thẩm định" hiện cho người dùng; danh sách bài nằm cuối màn |
| PayOS (chỉ xem) | PASS: 4 gói, gói PLUS hiện tại, nút mua khóa đúng, không tạo đơn |
| Harness OCR 40 ảnh | PASS (40/40, SHA khớp) |
| Bug build | File test đặt trong `src/app` làm hỏng bundle release; đã chuyển chỗ và thêm test chặn |

Ảnh chụp/log: `.artifacts/device-qa-20261106/` (local, không commit).

## 2. Đang làm, chưa xong

| Việc | Trạng thái | Cần gì |
| --- | --- | --- |
| Google Play internal | 1.0.15 (29) đã lên internal, cài qua Play trên Redmi, smoke PASS (khởi động lạnh lần đầu sau cập nhật 34,8 s do tối ưu dex một lần, các lần sau ~2 s). 1.0.16 (30) gồm bản sửa hồi quy OCR + i18n: xem mục 5 | Closed testing (alpha, code 28) giữ nguyên |
| Độ chính xác OCR | Parser không còn hồi quy nhưng 11/36 ảnh có nhãn vẫn thiếu tổng (ảnh mờ, nghiêng, hóa đơn dài) | Tiền xử lý ảnh/crop phía native (Kotlin) rồi đo lại bằng harness |
| Thử đăng ký/đăng nhập SĐT trên máy | Chưa thử vì phải đăng xuất tài khoản thật; đã có unit test và kiểm tra API production (SĐT lạ trả 401) | Thử bằng một tài khoản phụ |

## 3. Chưa làm (cần quyết định hoặc thao tác của chủ dự án)

1. **Thanh toán thật**: PayOS (đơn thật trên Redmi) và Google Play Billing — giữ nguyên theo yêu cầu.
2. **Dự báo AI (phần LLM)**: chờ đánh giá tác động theo Luật BVDLCN 91/2025 (lịch sử giao dịch là dữ liệu nhạy cảm), Gemini gói trả phí, nhóm thử 30 người × 8 tuần. Đã có nghiên cứu: [AI_FORECAST_RESEARCH](plans/AI_FORECAST_RESEARCH_20261105.md).
3. **SMS OTP**: cần nhà cung cấp và credential; bật bằng cấu hình.
4. **Quyền Google cho worker**: Publisher API (đọc track tự động) và bucket báo cáo tài chính (xác nhận doanh thu Google bằng số liệu thật).
5. **Ưu đãi trên bản Play**: tạo offer trong Play Console rồi ghi mã offer vào trang Ưu đãi.
6. **Publish chấm điểm học trên cloud**: duyệt nội dung qua admin (người duyệt khác người soạn) rồi bật `EXPO_PUBLIC_LEARNING_CLOUD_ENABLED`.
7. **Push lên GitHub và mở PR** khi bạn cho phép.

## 4. Đề xuất làm tiếp (theo thứ tự)

1. Tiền xử lý ảnh/crop phía native cho ảnh mờ và nghiêng; mở rộng nhãn Bill.
2. Thêm đăng nhập SĐT cho web; i18n các màn còn sót (rà bằng grep chuỗi tiếng Việt trong JSX).
3. Thử luồng SĐT bằng tài khoản phụ trên Redmi.
4. Nghiệm thu tiền thật PayOS (khi bạn sẵn sàng) và cập nhật `PROJECT_STATUS.md`.
5. Push nhánh, tạo PR vào `main`.

## 5. Kiểm tra gần nhất

- Mobile 1105 test PASS; typecheck và lint sạch (sau i18n ngày 06/11).
- API 180, web 62, landing 14, Edge 16, worker 19, SQL 23 suite PASS ở lần chạy toàn repo gần nhất.
- Production smoke: API ok, Web 200, Auth 401, CORS, TLS.

## 6. Ghi chú vận hành

- Máy phát triển thường thiếu RAM khi chạy Gradle song song với agent khác; nên chạy build một mình.
- Gradle không chạy lại bundle JS khi chỉ thay `.env.local`: xóa `android/app/build/generated/{assets,res,sourcemaps}/react/release` trước khi build khác cấu hình.
- Codex sandbox không gọi được `adb`; QA thiết bị do Claude thực hiện. Antigravity CLI ở chế độ headless cần quyền lệnh rõ ràng nên chưa dùng được.
- `codex exec` chạy nền phải đóng stdin (`< /dev/null`), nếu không sẽ treo ở "Reading additional input from stdin".
