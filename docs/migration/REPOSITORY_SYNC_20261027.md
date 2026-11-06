# Đồng bộ repository và dọn output — 27/10/2026

## Phạm vi

Theo yêu cầu chủ dự án: đồng bộ tài liệu toàn monorepo, chỉ giữ một nguồn thiết kế, dọn build/cache dư, giữ APK/AAB các phiên bản local, review/commit từng tệp và push nhánh hiện hành. Không deploy lại runtime, không chạy migration hoặc thay dữ liệu production trong lượt này.

## Đã thực hiện

- Đọc AGENTS.md và quy tắc kiến trúc; giữ tệp cấu hình riêng, secret/signing và dependencies ngoài cleanup.
- Dùng `npm run cleanup:generated` trước apply. Guard phát hiện AAB trung gian chưa backup; chỉ apply sau khi đã xác minh SHA-256 và giữ đầy đủ.
- 51 vị trí APK/AAB được kiểm kê, 44 nội dung khác nhau đã giữ trong `.artifacts/releases/`; manifest riêng tư chứa hash và đường dẫn gốc. Có artifact trung gian/QA để lưu lịch sử, không phải mọi file trong thư mục đều được phép phát hành.
- Script chuẩn đã xóa 32 thư mục output/cache khoảng 11,25 GiB; cleanup bổ sung xóa clone AVD/probe, bản APK trùng ngoài kho, archive deploy/bundle trích xuất và screenshot scratch, khoảng 4,789 GiB. Tổng khoảng 16,04 GiB trước khi chạy lại checks.
- Không xóa các bộ ảnh PNG/ZIP đã bàn giao trong `.artifacts/completion-20261027`, log nghiệm thu hoặc APK/AAB retained. Không đụng AVD/Gradle cache toàn cục ngoài workspace.
- `PICKET-DESIGN.md` là nguồn thiết kế duy nhất cho mobile Paper/landing/web. Loại proposal Nomad/flat cũ và preview/token snapshot web không dùng runtime; báo cáo UI có bằng chứng đổi tên thành checkpoint/acceptance.
- README root/mobile và trạng thái hiện hành dùng 1.0.7/code 20; Google Play readiness được bổ sung checkpoint mới. Thêm BACKLOG để không dùng mọi pending lịch sử làm hiện trạng.
- Chuyển toàn bộ liên kết tới tài liệu thiết kế đã loại sang nguồn chuẩn, cập nhật mục lục docs; giữ báo cáo lịch sử cùng chỉ dẫn hiện trạng.
- Tệp `Picket.FigmaDesign.Final.docx` đã bị xóa từ trước và được loại cùng thiết kế cũ; giữ feature catalogue vì là đặc tả chức năng, không phải bản design cạnh tranh.

## Kiểm tra và Git

Kiểm tra snapshot cuối: 914 mobile, 54 web, 13 landing, 140 Dart tests và 13 bộ SQL PGlite đạt; lint, typecheck, build Next.js và build landing với APK ký code 20 đều đạt. Kiểm tra 156 tài liệu Markdown không có liên kết nội bộ hỏng; git diff --check đạt. Audit 1.258 đường dẫn và 1.029 blob lịch sử chưa push không còn secret chưa xử lý hoặc blob quá 95 MB. Push được thực hiện sau chuỗi commit; HEAD trên remote được đối chiếu khi bàn giao. Artifact audit tại `.artifacts/repository-sync-20261027/`; không đưa credential hoặc APK/AAB vào Git. Các token có hình dạng secret trong hai Dart unit tests là fixture với project URL/mocked HTTP, không phải credential production.

Quy trình commit: stage từng đường dẫn được review; một tệp mỗi commit Conventional Commits. Chạy toàn bộ checks trên snapshot cuối và đối chiếu hash trước commit để không lặp lint/typecheck hàng trăm lần. Không reset thay đổi khác, không force push, không rewrite 290 commit local đã có trước lượt này.

Cleanup cuối sau build: thêm 50 thư mục build/Metro export, khoảng 0,30 GiB; các bản APK/AAB vẫn được giữ theo SHA-256. Tổng dung lượng thu hồi khoảng 16,34 GiB.
