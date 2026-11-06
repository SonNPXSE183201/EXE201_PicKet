# Đồng bộ mobile theo màn Nhà — 27/10/2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).

## Phạm vi

Lấy Nhà/Paper làm chuẩn, giữ Nunito và palette hiện có. Không chuyển sang NomadKit hoặc thay bảng màu người dùng đã chọn. Thẻ số dư và túi trên Nhà giữ cấu trúc đặc trưng; thẻ form/list trên các màn khác dùng cùng nền, khoảng cách và typography.

- Shared surface: radius 22, padding 16; page padding 20.
- Button/input: min-height 48; không khóa chiều cao để chữ lớn vẫn xuống dòng.
- Chip hiển thị gọn bên trong vùng chạm 48; icon action bỏ nền/viền tròn dư.
- Tiêu đề màn 24–26, section 18, body 14–15, metadata 12–13; Nunito theo weight thực.
- Chi tiêu: hàng giao dịch phẳng và badge cùng Nhà, giảm khoảng trắng ở filter.
- Cá nhân: thẻ hồ sơ ngang, avatar 48, menu/toggle gọn; bỏ nút lưu tùy chọn vì các toggle tự lưu.
- Dự định và các form dùng chung control; giảm weight quá đậm, giảm kích thước heading cũ.

## Đăng xuất và cập nhật

- Đọc pending mutation và conflict của đúng owner khi mở xác nhận đăng xuất. Hàng đợi trống dùng câu xác nhận trung tính; chỉ cảnh báo chưa đồng bộ khi có thay đổi thực. Không xóa bản nháp/outbox.
- Kiểm tra lỗi đọc queue và guard đổi owner/unmount; không mở dialog của tài khoản cũ.
- Updater chỉ cho kiểm tra ở idle/current/error. Khi có download/install/Play handoff không hiện nút kiểm tra lại cạnh hành động chính. Giữ quyền hủy tải và khả năng mở lại installer.

## Asset

Thư mục `assets/` chỉ dùng tham khảo. Các bản tương ứng đã tồn tại trong `apps/mobile/assets/paper`; không import từ thư mục root, không sao chép cả thư viện lần nữa.

- Tái sử dụng bloom, food, transport, leisure, shopping, home, health, gift.
- Danh mục sử dụng minh họa theo icon/tên; tên thật vẫn là nội dung đọc được, ảnh decorative.
- Công cụ/kỷ vật dùng shopping/gift; màn hóa đơn, calendar và review dùng receipt.
- Mặc định túi có tên dùng hình phù hợp danh mục thay vì hình ngẫu nhiên theo ID; lựa chọn đã lưu được ưu tiên, tone màu không bị reset.
- Bổ sung `receipt-envelope-v1.png` bằng imagegen: PNG alpha, giấy cắt, plum/lilac/sage/coral; không chữ và không giả lập giao diện.
- Các nền giấy và lettering tham khảo không được áp đại trà vì mục tiêu hiện tại là flat và typography thống nhất.

## Nghiệm thu

Ảnh review là ảnh chụp native từ package QA riêng `com.picket.mobile.acceptance` trên Picket_QA_35, không phải mockup AI. Dữ liệu minh họa nằm riêng trên máy ảo. Không thao tác điện thoại thật đang kết nối hoặc tài khoản tài chính thật.

Đã đối chiếu **50/50 route có giao diện**, tổng cộng **147 ảnh native**, với inventory ảnh; không tính `_layout` hoặc native-intent handler. Admin được chụp ở trạng thái không có quyền của tài khoản thường, không giả lập nội dung staff. Callback/verify/reset thể hiện form hoặc lỗi thiếu token, không thay thế nghiệm thu OAuth/inbox.

Có ảnh riêng cho form hồ sơ, filter/công cụ giao dịch, tạo ngân sách, thư viện minh họa túi, tạo kỷ vật, chọn ngày, sửa hóa đơn và 8 bước onboarding. Ảnh cuộn được đánh số riêng. Bổ sung các màn chính ở Paper tối và viewport 360dp/font scale 1.5; sửa wrap tháng, mô tả hồ sơ và tương phản switch tối sau khi xem ảnh. Viewport/font scale của AVD được khôi phục sau chụp; đã tắt máy ảo và Metro do lượt QA này mở.

Gallery: `.artifacts/completion-20261027/mobile-review/index.html`; ZIP: `.artifacts/completion-20261027/picket-mobile-paper-review.zip`. `coverage.json` đối chiếu route; `screens.json` chứa nhãn UI và trạng thái chụp. PNG là ảnh native nguyên bản; contact sheet chỉ là bản thu nhỏ để rà soát. Runtime native QA vẫn code 18 nên footer hiển thị 1.0.5 (18); UI JavaScript được tải từ source mới.

Hai tài khoản cloud minh họa được tạo để xem UI, không gửi email. Hóa đơn tổng hợp dùng provider manual qua API và Storage theo owner, không gọi AI. Đã đăng xuất, xóa đúng hai user, xác minh không còn object ảnh hóa đơn và xóa credential test. Onboarding được chụp trước khi gửi bước consent; sau đó fixture được khởi tạo qua API chỉ để thoát phiên và dọn. Không coi đây là nghiệm thu người dùng/consent thật.

Một lần OCR trên runtime debug QA trả lỗi nhận dạng; gallery giữ đúng ảnh trạng thái lỗi và nhập thủ công. Lượt này không tuyên bố camera/OCR thật PASS hoặc đóng các gate Billing/thiết bị thật.

## Lỗi chức năng phát hiện trong visual QA

Màn chia danh mục trước đây kiểm `!session` và không đọc splits cho guest, khiến vòng tải không kết thúc. Regression thực thi callback effect tái hiện RED; sửa điều kiện cho phép localMode, thêm dependency và giữ cleanup guard. GREEN xác minh guest load, signed-out không đọc và unmount không publish. Native đã chụp lại màn chia danh mục có form đầy đủ.

Các kiểm tra hồi quy khác xác nhận chỉ cảnh báo sign-out khi có pending/conflict, không hiện recheck cạnh Play/download/install, chọn minh họa theo tiếng Việt/icon và giữ scope/lựa chọn hình cũ.

Kiểm thử mobile cuối: **914/914 PASS**, chạy `node --import tsx --test --test-concurrency=2 "src/**/*.test.ts"`. ESLint không cảnh báo/lỗi. Log kiểm tra cuối: `compact-tests-final.log`, `compact-lint-final.log`, `compact-types-final.log`; RED/GREEN của splits và default pocket art lưu riêng. ZIP đã kiểm tra integrity; 136 tài liệu Markdown không có local link bị thiếu. Toàn bộ kiểm tra trong phạm vi mobile; không suy ra một CI run hoặc bản phát hành mới.

Typecheck `tsc --noEmit`: **PASS**. `git diff --check` trong phạm vi mobile và tài liệu cập nhật: **PASS**.

Đây là source UI mới để chủ dự án review; APK/AAB phát hành code 19 trước đó chưa chứa lượt thay đổi này.

## Cập nhật phát hành cùng ngày

Lượt source UI nêu trên đã được đóng gói trong **1.0.7/code 20** và đưa lên landing/Google Play Internal. [Báo cáo phát hành](ANDROID_RELEASE_1_0_7_20261027.md). Các ghi chú code 18 của máy QA và code 19 chưa chứa UI ở checkpoint trước được giữ làm lịch sử kiểm chứng.
