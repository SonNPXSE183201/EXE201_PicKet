# Kế hoạch: Dự báo tài chính cho người dùng và trang cấu hình admin (21/11/2026)

Trạng thái: **kế hoạch, chưa code**. Tài liệu nghiên cứu trước: [AI_FORECAST_RESEARCH_20261105.md](AI_FORECAST_RESEARCH_20261105.md).

## 1. Hiện trạng (kiểm tra ngày 21/11/2026)

**Kết luận: hệ thống chưa có chức năng dự báo tài chính nào mà người dùng thật dùng được, và admin cũng chưa có cài đặt hay API cho dự báo.**

| Thành phần | Có gì | Dùng được không |
|---|---|---|
| Màn "Thống kê" (`apps/mobile/src/app/insights.tsx`) | Thu/chi theo tháng, theo danh mục, nhịp 4 tuần; một câu nhận xét so với tháng trước theo luật cố định (dòng 81, 149–152) | Có, nhưng chỉ là thống kê lịch sử, không dự báo |
| Nhịp chi tiêu tuần ở Home (`features/cashflow/home-weekly-rhythm.tsx`) | So sánh tuần này với tuần trước | Có, không dự báo |
| Engine F0, dòng tiền tất định (`features/cashflow/forecast.ts:15`, bản Dart `apps/api/lib/src/cashflow_forecast.dart:20`) | Số dư đầu cộng các khoản định kỳ nhập tay, horizon 7 hoặc 30 ngày, kịch bản "mua một khoản" | **Không**: chỉ màn `cashflow-preview.tsx`, mà màn này redirect khi `!__DEV__` (dòng 30) |
| Engine F1, ước tính chi biến đổi (`features/cashflow/variable-spending.ts:14`) | Trung vị 28 ngày, cần đủ 28/28 ngày được đánh dấu "complete" | **Không**: sản phẩm chưa có UI đánh dấu ngày complete, nên chỉ chạy trong backtest |
| Ghi nhận sai số dự báo (`forecast-observations-preview.tsx`) | Ghi số dư thực tế để đo sai số | **Không**: bị chặn bởi `__DEV__` và cờ `EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED` (mặc định tắt) |
| API dự báo | Thư viện Dart có sẵn, nhưng **không route nào gọi** | Không |
| AI/LLM | Chỉ có Gemini cho phần học, chạy trên một tình huống tổng hợp, không dùng dữ liệu tài chính người dùng; production đặt `LEARNING_AI_ENABLED=false` | Không áp dụng cho dự báo |
| Admin web | Không có mục nào về dự báo hay AI trong `web/src/features/admin/admin-permissions.ts`; giới hạn theo gói (`/v1/admin/plan-limits`) mới chỉ áp cho OCR | Không |
| SQL | Không có bảng hay hàm `forecast*`, `ai_runtime*` | Không |

Test hiện có cho engine (đều pass): `apps/mobile/src/features/cashflow/forecast*.test.ts`, `variable-spending.test.ts`, `apps/api/test/cashflow_forecast_test.dart`, `variable_spending_test.dart`.

## 2. Mục tiêu

1. Người dùng thấy một **dự báo số dư cuối tháng** và **cảnh báo sắp hụt tiền** dựa trên dữ liệu của chính họ, có giải thích được và có khoảng tin cậy.
2. Admin bật/tắt, đặt giới hạn theo gói và theo dõi chất lượng dự báo mà không cần phát hành app mới.
3. Không gửi dữ liệu cá nhân cho bên thứ ba khi chưa có đồng ý; bản đầu không dùng LLM để tính số.

## 3. Phạm vi theo giai đoạn

### Giai đoạn 1: Dự báo thống kê trên máy (Free và Pro), khoảng 1,5–2 tuần

- **Nguồn dữ liệu:** giao dịch 90 ngày gần nhất, lịch định kỳ (cashflow schedules), ngân sách tháng, số dư ví.
- **Mô hình (tất định, giải thích được):**
  - Phần cố định: các khoản định kỳ còn lại trong tháng (tái dùng F0).
  - Phần biến đổi: ước tính chi mỗi ngày bằng trung vị có trọng số theo ngày trong tuần, tính từ 8 tuần gần nhất. Thay điều kiện "28/28 ngày complete" của F1 bằng ngưỡng **tối thiểu 21 ngày có ghi chép trong 28 ngày**. Loại khoản bất thường bằng cách cắt bỏ giá trị trên phân vị 95.
  - Khoảng tin cậy: P10 và P90 từ bootstrap các ngày quá khứ (tính trên máy, khoảng 500 lần lặp).
  - Mọi phép tính ngày dùng múi giờ `Asia/Ho_Chi_Minh` (sửa lỗi G5: hiện đang tính theo UTC).
- **UI:**
  - Thẻ "Dự báo cuối tháng" ở Home: số dư dự kiến, dải P10–P90, ngày có nguy cơ âm tiền. Bấm vào mở màn chi tiết với biểu đồ đường số dư theo ngày, kèm giải thích "vì sao": các khoản định kỳ sắp tới và mức chi trung bình mỗi ngày.
  - Khi chưa đủ dữ liệu: hiện "Cần thêm X ngày ghi chép" thay cho một con số sai.
  - Gỡ chặn `__DEV__` khỏi `cashflow-preview.tsx` sau khi đổi giao diện theo Figma.
- **Gói:** Free xem dự báo tháng hiện tại. Pro có thêm kịch bản "Nếu tôi mua X" và dự báo 60/90 ngày.
- **Đo chất lượng:** mỗi cuối tháng, app ghi lại sai số tuyệt đối giữa dự báo ngày 1, ngày 15 và số dư thực tế (tái dùng `forecast-observations`). Dữ liệu này chỉ gửi lên dạng tổng hợp ẩn danh khi người dùng đồng ý analytics.

### Giai đoạn 2: Cấu hình admin và API, khoảng 1 tuần

- **Bảng `public.forecast_settings`** (một dòng, có `revision`, `updated_by`, `updated_at`) và bảng `forecast_settings_audit`, theo mẫu `plan_limits`:
  - `enabled` (bool), `min_history_days` (mặc định 21), `horizon_days_free` (30), `horizon_days_pro` (90), `scenario_enabled_plans` (mảng gói), `confidence_band` (`p10_p90` hoặc `p25_p75`), `copy_version`.
- **API:**
  - `GET /v1/forecast/settings`: công khai, có cache 60 giây; app đọc giống `/v1/auth/channels`.
  - `GET` và `PUT /v1/admin/forecast-settings`: quyền `settings.write`, bắt buộc MFA, có `reason` và `revision` để chống ghi đè (theo mẫu `routes/v1/admin/plan-limits.dart`).
- **Admin web:** thêm thẻ "Dự báo tài chính" trong mục **Cài đặt** gồm công tắc bật/tắt, các ô số, chọn gói và lịch sử thay đổi. Thêm biểu đồ "Sai số dự báo trung vị theo tháng" ở **Tổng quan**, lấy từ dữ liệu tổng hợp ở giai đoạn 1.
- **Phân quyền:** thêm capability `forecast.read` và `forecast.write` vào `admin-permissions.ts` cùng bảng permission groups.

### Giai đoạn 3 (tuỳ chọn, Pro): Giải thích bằng AI, khoảng 2 tuần, chỉ làm khi giai đoạn 1 đạt chỉ tiêu

- AI **không tính số**. AI chỉ viết 2–3 câu giải thích và gợi ý từ **số liệu tổng hợp** (tổng chi theo danh mục, % thay đổi), không gửi giao dịch thô, mô tả hay tên cửa hàng.
- Bắt buộc màn đồng ý riêng, giống `learning_ai_consents`. Dùng key trả phí, không dùng free tier (free tier có thể bị dùng để huấn luyện).
- Admin có thêm: công tắc AI, model, trần chi phí tháng (USD), quota theo gói (đề xuất Free 0, Pro 5 lần/ngày) và bảng `ai_usage_ledger` để theo dõi chi phí.
- Đầu ra chỉ hiển thị khi qua bộ lọc: không khuyến nghị sản phẩm đầu tư hay vay, không cam kết lợi nhuận.
- Cập nhật Data Safety trên Google Play trước khi bật.

## 4. Tiêu chí hoàn thành và chỉ số

- Sai số tuyệt đối trung vị của dự báo ngày 15 ≤ 15% tổng chi tháng, đo trên ít nhất 30 người dùng có đủ dữ liệu.
- Ít nhất 40% người dùng đủ điều kiện mở thẻ dự báo ít nhất 1 lần mỗi tháng.
- Không có lỗi crash mới; màn dự báo hiện trong dưới 300 ms trên Redmi 7.
- Test: unit test engine (múi giờ, ngưỡng dữ liệu, ngoại lai, bootstrap), test hợp đồng API settings, test SQL quyền admin, test giao diện vi/en.

## 5. Rủi ro

- Dữ liệu ghi chép thiếu làm dự báo sai: dùng ngưỡng dữ liệu tối thiểu và khoảng tin cậy rộng, và nói rõ đây là ước tính.
- Người dùng hiểu dự báo là lời khuyên tài chính: thêm dòng miễn trừ và không gợi ý sản phẩm.
- Tính trên máy tốn pin: chỉ tính lại khi có giao dịch mới hoặc khi mở app, và lưu cache kết quả trong ngày.

## 6. Thứ tự việc

1. Sửa múi giờ và nới ngưỡng dữ liệu của F1, kèm test.
2. Engine dự báo tháng, bootstrap P10–P90, kèm test và backtest trên dữ liệu tổng hợp.
3. Thẻ ở Home và màn chi tiết theo Figma; gỡ `__DEV__`.
4. Bảng `forecast_settings`, API, trang admin, phân quyền.
5. Đo sai số thật trong 1 tháng, rồi mới quyết định có làm giai đoạn 3 hay không.
