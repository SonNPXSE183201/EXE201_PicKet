# Plan: PayOS — link 15 phút, hủy link cũ, đối soát trước khi hết hạn

Ngày 05/11/2026, nhánh `fix/mobile-completion-plan`. Nguồn yêu cầu: góp ý của người hướng dẫn về PayOS. **Trạng thái: P1, P2 đã code và có test; P3 chờ chủ dự án.**

## Hiện trạng đã có (không làm lại)

| Yêu cầu | Hiện trạng |
| --- | --- |
| `expiredAt` khi tạo link | Đã gửi, nhưng lấy từ `billing_orders.expires_at` (đặt lúc **reserve**, không phải lúc tạo link) — `apps/api/lib/src/payos_service.dart` |
| orderCode mới mỗi lần mua | Đã có: sequence `payos_order_code_seq`; mobile dùng idempotency key mới sau mỗi checkout thành công |
| Chỉ mở gói khi PAID | Đã có: `payment_receive` chỉ cấp quyền khi webhook/GET đã ký, `code=00`, đủ tiền, đúng tài khoản nhận. Không có luồng mở gói theo ảnh chuyển khoản |
| GET trước khi đánh dấu hết hạn | Một phần: trạng thái `expired`/`cancelled` chỉ được ghi sau GET PayOS trong `reconcile`; worker chạy mỗi ~5 phút |
| Doanh thu chỉ đơn đã thanh toán | **Chưa**: `payment_dashboard` cộng mọi `payment_transactions`, kể cả đơn `review` (trả 2 lần/thiếu/thừa) |

## Khoảng trống và cách sửa

### P1 — Backend (không cần thao tác của chủ dự án)

1. **expiredAt = now + 900 lúc tạo link.** API tính `expiredAt` ngay trước `createPayment`; `payment_attach` ghi lại `expires_at` theo đúng giá trị đã gửi PayOS. Nếu link được tạo trễ (nhánh `refresh` khi chưa có link) thì không dùng thời hạn đã cũ.
2. **Bấm mua khi còn link chờ ⇒ hủy link cũ rồi tạo link mới.** Bỏ chặn `A payment is already pending` trong `payment_reserve`; API `POST /orders` với đơn pending cũ: GET trạng thái → nếu `PAID` thì ghi giao dịch, cấp gói và **không** tạo link mới; nếu còn `PENDING` thì gọi `/cancel`, ghi `cancelled`, rồi reserve orderCode mới.
3. **Hủy an toàn.** Nút hủy: GET trước, chỉ cancel khi còn `PENDING`; nếu đã `PAID` thì xử lý như thanh toán thành công.
4. **Tiền vào sát giờ hết hạn vẫn mở gói.** Sửa `payment_receive` (migration mới, forward-only): đủ tiền và đơn ở `pending`/`expired`/`cancelled` ⇒ ghi giao dịch và cấp gói, kể cả `paid_at > expires_at`. Chỉ đưa vào `review` khi thiếu/thừa tiền, hoặc người dùng đã có gói đang hiệu lực (trả 2 lần ⇒ hoàn tay).
5. **Đơn không bao giờ kẹt ở “chờ thanh toán”.** Worker ưu tiên đơn `pending` đã quá hạn; GET trước khi đánh dấu `expired`. Đơn không tạo được link và đã quá hạn ⇒ `expired` trực tiếp (không có link nên không thể có tiền vào). Rút chu kỳ đối soát đơn quá hạn xuống ~1 phút.
6. **Doanh thu chỉ cộng đơn `paid`.** `payment_dashboard` join `billing_orders.status='paid'`; trả thêm `reviewTotal` để admin thấy số tiền cần hoàn/đối soát, không cộng vào doanh thu.

### P2 — Mobile và web (không cần thao tác của chủ dự án)

1. Đồng hồ đếm ngược 15 phút cho đơn pending trên mobile (`payos-billing-screen.tsx`) và web (`payment-panel.tsx`); hết giờ thì tự gọi `refresh` (API GET PayOS) và hiện “Hết hạn”.
2. Đơn pending đã quá giờ nhưng chưa đối soát hiển thị “Đang xác minh”, không hiện “Chờ thanh toán” và không cho mở link cũ.
3. Nút mua luôn bật khi đang ở gói Free; nếu có link cũ thì hỏi xác nhận “Hủy link cũ và tạo link mới?”.
4. Admin: nhãn tiếng Việt `Đã thanh toán / Hết hạn / Đã hủy` (+ `Chờ thanh toán` chỉ trong 15 phút, `Cần đối soát` là ngoại lệ). Mặc định lọc bỏ đơn pending đã quá hạn.
5. Chuỗi trên màn PayOS mobile đi qua i18n đầy đủ.

### P3 — Cần chủ dự án quyết định/thao tác

1. **Gói sáng lập 99k cho 100 người đầu**: hiện catalog chỉ có Plus 19k/199k, Pro 39k/499k. Cần xác nhận tier, thời hạn và cách đếm suất (đề xuất: đơn `paid` + đơn `pending` chưa hết hạn giữ suất; hết hạn/hủy thì trả suất; giá khóa theo đơn). Sau khi có quyết định mới thêm migration catalog `max_slots`.
2. Deploy migration + API/web lên VPS production (tự làm được qua SSH, nhưng cần xác nhận trước vì là production).
3. Nghiệm thu tiền thật trên Redmi với `com.picket.mobile.bugqa`: thanh toán trong hạn, để hết hạn, hủy, bấm mua lại khi có link cũ, quét QR cũ sau khi hủy.

## Kiểm thử

- SQL (`supabase/tests/payos-auth-permissions.sql`): late payment sau `expires_at` vẫn `paid`; đã có gói ⇒ `review`; doanh thu bỏ đơn `review`; reserve khi có pending cũ.
- Dart (`apps/api/test/payos_service_test.dart`): `expiredAt` = now+900; GET trước cancel; PAID khi cancel ⇒ không tạo link mới.
- Mobile/web: logic đếm ngược và nhãn trạng thái (test thuần TS).
