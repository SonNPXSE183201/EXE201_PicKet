# Phương án chấm tình huống qua cloud

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Ngày đối chiếu: 24/10/2026. Trạng thái: nghiên cứu, chưa bật billing, chưa gửi đáp án thật, chưa chọn model sản xuất. Người dùng đã chọn nghiên cứu cloud; lựa chọn đó không thay thế đồng ý trả phí hoặc consent của người dùng cuối.

## Kết luận

**Quyết định của chủ sản phẩm ngày 25/10/2026:** hiện tại chỉ dùng miễn phí;
có thể trả phí và mở rộng khi có nhiều người dùng. Đây là định hướng tương lai,
chưa phải cho phép bật billing, ngân sách cụ thể hoặc tự chuyển sang dịch vụ trả phí.
Ở giai đoạn hiện tại, giữ luồng free chỉ cho dữ kiện giả lập cố định. Câu trả lời
tự do dùng nháp mã hóa và rubric cục bộ; chưa bật chấm cloud cho đáp án thật.
Phương án trả phí dưới đây là nghiên cứu cho giai đoạn sau, không phải cấu hình
triển khai hiện tại. Khi chuyển giai đoạn cần chốt nhà cung cấp, ngân sách, consent,
đánh giá chất lượng và nghiệm thu riêng; không cam kết khả năng scale chưa đo.

Giữ nguyên Gemini free cho ví dụ giả lập cố định. Với đáp án tự do, đề xuất đánh giá **Gemini Standard paid, không Contributor** bằng bộ dữ liệu giả lập trước. Chưa triển khai gửi đáp án thật dưới cấu hình hiện tại. Không có căn cứ để cam kết một phương án cloud vừa miễn phí tuyệt đối vừa đáp ứng các điều kiện dữ liệu bên dưới.

## Điều khoản đã xác minh

- Unpaid Services có thể dùng input/output cải thiện sản phẩm; con người có thể đọc để review. Điều khoản yêu cầu không gửi thông tin cá nhân, nhạy cảm hoặc bí mật. Ngoại lệ EEA/Thụy Sĩ/UK không được mặc định áp dụng cho người dùng Việt Nam. Paid Services có điều khoản xử lý dữ liệu và cam kết không dùng prompts/responses cải thiện sản phẩm. Google còn giới hạn dịch vụ/API client về người dùng dưới 18 tuổi; cần kiểm tra đối tượng phục vụ trước khi mở. Nguồn: [Gemini API terms, hiệu lực 23/03/2026](https://ai.google.dev/gemini-api/terms).
- Trang abuse monitoring công bố giữ prompt, context và output **55 ngày**, có cơ chế review bởi nhân viên được phép. Paid không đồng nghĩa không lưu dữ liệu. Xóa trong PicKet không thu hồi bản đã gửi provider. Nguồn: [Abuse monitoring](https://ai.google.dev/gemini-api/docs/usage-policies).
- Bảng giá có Standard paid không dùng dữ liệu cải thiện sản phẩm, nhưng **Contributor** private preview có dùng dữ liệu dù trả tiền. Vì vậy không chỉ kiểm tra “đã bật billing”. Phải xác minh tier và điều khoản thực tế; không suy ra bật billing sẽ tạo một luồng miễn phí, riêng tư. Nguồn: [Pricing](https://ai.google.dev/gemini-api/docs/pricing).

## Chi phí để so sánh, chưa phải model đã nghiệm thu

Giá Standard text tại thời điểm đối chiếu, USD/triệu token:

| Model ứng viên | Input | Output, gồm thinking |
|---|---:|---:|
| `gemini-2.5-flash-lite` | 0.10 | 0.40 |
| `gemini-3.1-flash-lite` | 0.25 | 1.50 |

Nguồn: [bảng giá chính thức](https://ai.google.dev/gemini-api/docs/pricing). Ví dụ tính riêng 2.000 input + 300 output token: khoảng 0,00032 USD hoặc 0,00095 USD/lượt, lần lượt theo hai dòng. Đây là phép tính giả định, chưa gồm thuế, retry, token phát sinh hoặc công cụ; không phải báo giá hay bằng chứng chất lượng chấm. Không bật Search/Maps, file, cache hoặc công cụ ngoài cho assessment. Model/endpoint/schema phải được xác nhận lại trước khi bật.

## Thiết kế đề xuất trong repo

Tái sử dụng cơ chế worker server-only, timeout, durable dispatch, một lần gọi provider, consent generation, quota và kiểm tra output. **Không mở rộng payload của job `cash-gap-v1` hiện có**: tạo job/consent/endpoint assessment riêng để giữ nguyên ranh giới đã kiểm thử.

Payload tối thiểu chỉ gồm mã tình huống biên soạn, phiên bản rubric, ngôn ngữ và đáp án người dùng xác nhận. Không gửi ledger, hóa đơn, tài khoản, tên hồ sơ hay định danh owner sang model. Đáp án vẫn có thể chứa thông tin cá nhân; giới hạn độ dài và phát hiện mẫu dữ liệu chỉ là lớp hỗ trợ, không phải bằng chứng đã ẩn danh.

Đầu ra cần đủ 5 criterion ID đã duyệt, điểm mỗi tiêu chí trong 0–20, dẫn chứng khớp đoạn đáp án, phiên bản rubric và trạng thái từ chối chấm. Tổng điểm do backend tính. Không nhận điểm tự khai từ client, không gắn điểm với tiền hoặc entitlement. Schema đúng không chứng minh chấm đúng; vẫn cần bộ case và hai reviewer. Nguồn về khả năng schema: [Structured outputs](https://ai.google.dev/gemini-api/docs/structured-output).

Nháp mặc định ở thiết bị. Nếu người dùng gửi cloud, cần consent riêng nêu provider, mục đích, retention và giới hạn thu hồi sau dispatch. Job/output phải owner-scoped, có TTL, xóa/revoke và không ghi raw text vào log. Chấm lại/báo sai cần thao tác rõ; không tự gọi provider khi retry mạng hoặc khi quota hết. Khi lỗi, giữ nháp và hiện rubric, không gán điểm 0.

## Điều kiện mở còn thiếu

1. Giai đoạn hiện tại đã chốt free-only ngày 25/10/2026. Trước giai đoạn trả phí cần quyết định mới về nhà cung cấp, ngân sách và giới hạn ứng dụng; chưa có quyền tự kích hoạt.
2. Xác minh Standard/non-Contributor, DPA, đối tượng tuổi và cấu hình provider. Không coi biến môi trường tự khai là bằng chứng điều khoản tài khoản.
3. Cập nhật consent, privacy và Data Safety; kiểm thử RLS/TTL/revoke trước khi gửi dữ liệu thật.
4. Hoàn thiện rubric và benchmark giả lập Việt–Anh, reviewer độc lập, quy trình báo sai/chấm lại.
5. Kiểm thử staging, kill switch, quota và quan sát chi phí. Ngân sách ứng dụng là lớp giới hạn, không hứa hóa đơn provider tuyệt đối không vượt dự toán.

Vertex/enterprise có cơ chế retention riêng nhưng cấu hình phức tạp hơn, không mặc định zero-retention hoặc miễn phí; chỉ cân nhắc khi có yêu cầu và ngân sách phù hợp. Nguồn: [hướng dẫn retention chính thức hiện được chuyển hướng sang Gemini Enterprise Agent Platform](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/zero-data-retention).

Không có thay đổi billing, secret, provider đang chạy hoặc dữ liệu production trong nghiên cứu này.
