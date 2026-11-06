# Expo Android — ngân sách theo kỳ và hoàn tiền guest (2026-10-17)

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Nguồn: khoảng thiếu trong `FLUTTER_EXPO_GAP.md`. Phạm vi lát này là màn Ngân sách dùng hạn mức tháng từ Kế hoạch, cùng cách trừ hoàn tiền của giao dịch chia danh mục ở chế độ guest. Không sửa Next.js.

| Hành vi | RED | GREEN | Giới hạn |
| --- | --- | --- | --- |
| Hạn mức sau điều chuyển/chuyển dư thay hạn mức mặc định trong số còn/vượt và tỷ lệ | `npx tsx --test src/core/local/budget-overview.test.ts` thất bại vì selector chưa tồn tại | 3/3 test selector đạt; màn Ngân sách lấy `getPlanning` theo tháng cho tài khoản và `planningPeriods` cho guest. Trên AVD, tạo hai ngân sách guest 1.000.000 ₫, điều chuyển 200.000 ₫; Ngân sách hiện 800.000/1.200.000 ₫, force-stop/mở lại vẫn giữ. Tạo một ví và khoản chi 200.000 ₫ gắn danh mục nguồn; Ngân sách hiện đã dùng 25%, còn 600.000 ₫. | Chưa thử chuyển dư sau chốt tháng qua UI; cloud split chưa có aggregate trong danh sách giao dịch |
| Hoàn tiền guest không có danh mục riêng trừ khỏi danh mục của giao dịch gốc đã chia khoản | Test mới `guest budget spending deducts a refund...` thất bại, nhận 100000 thay vì 80000 | 9/9 test guest finance đạt; tỷ lệ hoàn tiền phân bổ theo khoản chia gốc | Chưa kiểm thử ảnh hưởng lên số liệu khi nhập bản sao thực từ Flutter |
| Kế hoạch guest giữ sau khởi động lại | Không có RED tự động cho native | APK release x86_64 cài đè AVD `Picket_Production_Test`; chọn `Phong bì`, force-stop/mở lại, radio vẫn checked. Bật airplane mode (`Active default network: none`), chọn `Zero-based`, force-stop/mở lại vẫn ở guest và radio `Zero-based` checked; tắt airplane mode sau thử | Chỉ smoke test phương pháp, chưa thử các thao tác tài chính khác |

Kiểm tra khác: `npm run typecheck` đạt; `npm run lint` 0 lỗi/25 cảnh báo; `npx expo export --platform android` đạt; Gradle `:app:assembleRelease -PreactNativeArchitectures=x86_64` đạt ở lần chạy tuần tự. Lần build trước đó thất bại tạm thời tại `:expo:compileReleaseKotlin`; chạy lại riêng task Kotlin và build tuần tự đều đạt. Các suite API, auth, OCR, sync, UI, billing lần lượt đạt 7/7, 5/5, 25/25, 13/13, 8/8, 3/3.

Chưa đo coverage và chưa test tương tác/khả năng đồng bộ từng chức năng trên Android; AVD chỉ bao phủ những kịch bản guest nêu trên. Worktree đã có nhiều thay đổi chưa commit từ trước nên không tạo checkpoint commit TDD để tránh cuốn theo thay đổi ngoài phạm vi.

## Lát tiếp theo — phân bổ khoản chia trên tài khoản cloud

- RED: test `budget overview allocates split expenses and partial refunds to each category` nhận `spent=0`, mong đợi `45000`.
- GREEN: selector đọc `TransactionSplit` trước `categoryId` trực tiếp, chia hoàn tiền theo tỷ lệ giao dịch gốc. Expo tải split theo lô tối đa 25 ID, gồm khoản chi trong tháng và khoản chi gốc của hoàn tiền trong tháng. API Dart có endpoint đọc theo lô và dựa vào RLS hiện có của `transaction_splits`.
- Xác minh: 6/6 unit test selector/batch, 72/72 Dart test, `dart analyze` exit 0 (20 thông báo info có sẵn), Expo typecheck và lint exit 0 (25 warning có sẵn), route mới có trong `dart_frog list`. Chưa có integration test Supabase thật, chưa build/cài APK mới, chưa triển khai endpoint lên VPS. Nếu API hoặc mạng lỗi, màn Ngân sách cloud báo chưa tính được thay vì hiển thị số chi sai.

## Lát tiếp theo — chốt tháng và chuyển dư guest

- RED: test chốt tháng 09/2026 với chuyển dư khi tháng 10/2026 đã chốt thất bại vì reducer không ném lỗi, có thể thay đổi hạn mức của tháng đã khóa.
- GREEN: reducer từ chối chuyển dư sang tháng sau đã chốt. Test chuyển dư trên khoản chi chia danh mục 60.000/40.000 ₫ và hoàn tiền 20.000 ₫ tính hạn mức tháng sau cho danh mục đầu là 152.000 ₫. `npx tsx --test src/core/local/guest-finance.test.ts`: 11/11 đạt.
- Android AVD `Picket_Production_Test`: build `:app:assembleRelease -PreactNativeArchitectures=x86_64` thành công, `adb install -r` thành công. Trên dữ liệu guest test, chốt tháng 09/2026 có chuyển dư qua hộp xác nhận. Tháng 10/2026 hiển thị hạn mức 1.800.000 ₫ và 2.200.000 ₫ sau khoản điều chuyển 200.000 ₫ trước đó; khoản chi 200.000 ₫ còn 1.600.000 ₫ ở ngân sách đầu. Force-stop/mở lại vẫn giữ các số này.
- Giới hạn: chưa thử giao dịch chia danh mục/hoàn tiền qua Android trong cùng kịch bản, chưa đo coverage; cần xử lý tương đương cho hàm SQL cloud và kiểm thử DB trước khi coi hoàn tất.

## Lát tiếp theo — chốt tháng cloud theo split thực tế

- Journey: tài khoản cloud chốt tháng có khoản chi chia danh mục và hoàn tiền một phần; hạn mức chuyển sang tháng sau phải trừ đúng khoản chi ròng từng danh mục. Không cho chốt muộn có chuyển dư vào tháng sau đã chốt.
- RED: `node supabase/tests/validate.mjs` với fixture 100.000 ₫ chia 60/40 và hoàn 20.000 ₫ chia 12/8 nhận hạn mức tháng sau 200.000 ₫ thay vì 152.000 ₫.
- GREEN: migration `202610180001_budget_planning_split_rollover.sql` ưu tiên split của mỗi khoản chi/hoàn tiền, có fallback cho bản ghi cũ không có split; kiểm tra tháng kế tiếp đã chốt trước khi ghi. `node validate.mjs` đạt sau khi áp dụng toàn bộ migration vào PGlite. Test cũng xác nhận chốt 03/2026 có chuyển dư bị từ chối nếu 04/2026 đã chốt.
- Expo RED: test refund split 11.000/9.000 nhận chi tiêu 48.000 ₫ thay vì 49.000 ₫; test tải lô không lấy ID hoàn tiền. GREEN: 7/7 test budget/batch đạt; `npm run typecheck` và toàn bộ `npm run test:mobile` đạt; lint 0 lỗi, 25 cảnh báo hiện có. Test SQL tiếp tục tái hiện lỗi `purge_user_data` bị trigger khóa tháng chặn nếu không xóa `month_closes` thủ công. Migration `202610180002_purge_closed_month_data.sql` chuyển bước xóa tháng đã chốt lên trước split và transaction; PGlite chạy xanh, kiểm tra không còn close/split của tài khoản và `authenticated` không được gọi purge. Ngày 2026-10-17 đã đẩy migration lên Supabase production; `migration list` khớp local/remote và `db lint --linked` sạch.
- Ngày 2026-10-17: Dart API có 72/72 test đạt; `dart analyze` không có error/warning nhưng còn 20 info. Đã sao lưu source API cũ và dựng image rollback trên VPS, triển khai riêng container API mới. HTTPS `/health` trả 200 và `GET /v1/transaction-splits?ids=...` không token trả 401; log không có lỗi khởi động.
- Ngày 2026-10-17: E2E production với hai tài khoản tạm xác nhận `GET /v1/transaction-splits` trả 2 split cho chủ sở hữu và 0 cho tài khoản khác. Tài khoản có split trong tháng 09/2026 chốt tháng rồi xóa qua `DELETE /v1/account` thành công; Supabase Auth xác nhận user không còn. Script `.artifacts/prod-closed-month-split-e2e.py` dọn cả hai tài khoản thử. Expo `typecheck`, toàn bộ `npm run test:mobile` và release preflight đạt. APK x86_64 build/cài đè AVD thành công (SHA-256 `E984FBC6E2D13DB4A981D4F21DD87E16BBDD7A785A4DC70AA1A44EA841C2C63E`); cold start giữ dữ liệu guest, không thấy fatal/JS error.
- Giới hạn: Chưa chạy màn ngân sách cloud với tài khoản thử trên Android, chưa E2E chốt tháng có chuyển dư/split hoàn tiền trên production, chưa đo coverage. Vì vậy chưa nâng chức năng lên `verified`.
