# OMICall và eSMS cho OTP PicKet

Ngày tra cứu: **03/11/2026**. Phạm vi: developer cá nhân chưa đăng ký kinh doanh, xác minh SĐT bằng mã 6 số, giữ đăng nhập SĐT + mật khẩu và Supabase Auth. Đây là nghiên cứu tài liệu công khai; chưa có báo giá riêng, phê duyệt tài khoản, thử gửi hoặc thử gọi thực tế.

## Kết luận cho PicKet

**Ưu tiên hỏi eSMS về tuyến OTP đầu số cố định hoặc sender dùng chung cho cá nhân.** Chỉ chọn sau khi được xác nhận bằng văn bản về hồ sơ, nhà mạng, mẫu tin và giá. Tài liệu cũ có đề cập cá nhân, nhưng không đủ chứng minh hiện nay PicKet sẽ được cấp production.

OMICall đáng cân nhắc nếu cần cuộc gọi đọc OTP hoặc tổng đài. Chưa tìm được giá công khai đủ rõ cho dịch vụ Voice OTP độc lập. Không cần mua gói tổng đài nhiều nhân viên chỉ để thử OTP khi chưa xác nhận điều kiện API.

OMICall giới thiệu SMS Brandname **qua eSMS.vn**; vì vậy đây không phải hai tuyến SMS độc lập để mặc nhiên dùng dự phòng. Chưa xác minh hai dịch vụ có dùng chung tài khoản, key hoặc hợp đồng. [Nguồn OMICall](https://omicall.com/sms-brandname/).

## So sánh

| Nội dung | eSMS | OMICall |
|---|---|---|
| Kênh phù hợp khảo sát | SMS OTP đầu số cố định/sender dùng chung; có quảng bá Voice OTP | SMS qua eSMS; AutoCall có TTS |
| Cá nhân chưa có giấy kinh doanh | Chính sách cũ nêu cá nhân; phải xác nhận lại tuyến hiện hành | Chưa tìm được cam kết công khai đủ rõ cho OTP production của cá nhân |
| Credentials | ApiKey + SecretKey | API key đổi lấy access token |
| Gửi mã Supabase sinh | API SMS nhận nội dung, phù hợp về mặt giao diện | AutoCall nhận biến TTS; cần kiểm chứng đọc chính xác từng chữ số |
| Giá OTP riêng cho PicKet | Chưa có | Chưa có |
| Cần làm trước | Cấp tuyến/sender, duyệt mẫu, báo giá | Xác nhận gói API, đầu số gọi ra, TTS, phí và endpoint production |

## Giá: phân biệt giá tham khảo và báo giá OTP

[Trang chính sách giá eSMS](https://esms.vn/chinh-sach-gia) niêm yết **450đ/SMS đầu số cố định** và **520đ/SMS Brandname**, nhưng đặt trong mục dịch vụ quảng cáo. Không thể mặc định đây là giá OTP áp dụng cho PicKet. Trang cũng nói giá biến động.

Cùng trang, eVoice hiển thị các mức 280đ/300đ và cách tính block 6 giây đầu, giây tiếp theo. Cách trình bày chưa đủ rõ để kết luận giá một cuộc gọi OTP; cần bảng cước giải thích đơn vị, phí đầu số, nền tảng, TTS, cuộc không nghe máy và gọi lại.

OMICall công bố khoảng **290–600đ/tin** tùy nhà mạng/loại tin trên trang SMS; đây là khoảng tiếp thị chung, không phải báo giá OTP cho tài khoản cá nhân. Ưu đãi 2.000 tin trên trang là **Zalo ZBS**, không phải 2.000 SMS OTP miễn phí. [Nguồn](https://omicall.com/sms-brandname/).

[Bảng giá OMICall](https://omicall.com/bang-gia/) có gói Contact Center 200.000đ/user/tháng, tối thiểu 5 user, thanh toán theo kỳ 6 tháng. Đây là giá tổng đài; chưa chứng minh bắt buộc mua gói này để dùng OTP/AutoCall độc lập.

Ví dụ dự toán **giả định** được xác nhận 450đ/một SMS, một segment: 100 tin = 45.000đ; 500 = 225.000đ; 1.000 = 450.000đ. Nếu gửi lại thêm 20%, 1.000 lượt xác minh có thể dùng 1.200 tin = 540.000đ. Chưa bao gồm VAT/phí cố định và không phải báo giá.

## Cá nhân có được gửi không?

[Chính sách eSMS ngày 22/09/2018](https://esms.vn/tin-tuc/quy-dinh-ve-viec-su-dung-dau-so-co-dinh-10-so-va-verify-trong-quang-cao-va-cskh) đề cập cá nhân/tổ chức dùng đầu số cố định và cá nhân/doanh nghiệp dùng Verify để xác thực đăng ký, kích hoạt. Mẫu phải đăng ký; tuyến Verify còn có giới hạn cách ghi tên dịch vụ.

Đây là bằng chứng có mô hình phục vụ cá nhân trong tài liệu, **không phải xác nhận chính sách 2026**. Không mặc định được thêm tiền tố PicKet vào mẫu sender dùng chung. Việc cấp brandname riêng cũng khác với việc được gửi qua đầu số cố định hoặc sender dùng chung.

Đối với OMICall, cần hỏi rõ họ có nhận cá nhân dùng Voice OTP không, cần hồ sơ nào, có cấp đầu số gọi ra và API độc lập không. Chưa có đủ bằng chứng để hứa rằng chỉ tạo tài khoản là gọi được.

## Lấy key và kích hoạt

### eSMS

1. Đăng ký từ [cổng eSMS](https://account.esms.vn/).
2. Vào **Quản lý API** lấy **ApiKey và SecretKey** theo [hướng dẫn chính thức](https://developers.esms.vn/readme/lay-thong-tin-apikey-va-secretkey).
3. Yêu cầu kích hoạt đúng tuyến OTP, sender/template và nhà mạng. Key hợp lệ chưa có nghĩa tài khoản được gửi live.
4. Xin ví dụ HTTPS POST JSON đã xác nhận cho tuyến được cấp. Tránh mẫu GET đặt key và OTP trên URL vì dễ lọt vào access log.
5. Sau khi được cấp mới thử tới các số có sự đồng ý; đối soát số dư, SMS ID và trạng thái nhận thực tế.

Tài liệu [SMS cố định](https://developers.esms.vn/esms-api/cac-api-khac/gui-tin-co-dinh-gia-re-dang-get) nhận Content và SmsType=8; RequestId hỗ trợ chống trùng trong 24 giờ. CodeResult=100 là tiếp nhận yêu cầu, không phải người dùng đã nhận hoặc xác minh thành công.

[Bảng mã lỗi](https://developers.esms.vn/esms-api/bang-ma-loi) có lỗi tài khoản chưa kích hoạt/khóa, IP chưa cho phép, sai mẫu và nhà mạng chưa đăng ký. Đây là các điều kiện cần kiểm tra trước khi quy lỗi cho code.

### OMICall

1. Đi từ nút đăng ký trên [website OMICall](https://omicall.com/), hiện trỏ tới SSO OMI CRM.
2. Tài liệu chỉ dẫn **Tài khoản → Cấu hình → Quản lý API** để lấy key. [Tổng quan API](https://api.omicall.com/omicall-api/overview).
3. API xác thực đổi key lấy Bearer access token, tài liệu ghi hạn 24 giờ. Mẫu đưa key vào query string cần che khỏi log. [Xác thực](https://api.omicall.com/omicall-api/authentication).
4. Xin endpoint production và quyền AutoCall. Trang tổng quan còn ghi base URL chứa `stg` và phiên bản cập nhật năm 2021, nên không sao chép cấu hình đó thẳng vào production.

[AutoCall API](https://api.omicall.com/omicall-api/autocall) có `execute_by_phone`, biến TTS, danh sách số nhận và đầu số gọi ra. Tài liệu nêu gói trial không cho AutoCall. API trả ID phiên gọi chưa chứng minh đã đọc mã hoặc xác thực người dùng.

## Điểm cần xác minh trong tài liệu Voice OTP

Trang [eSMS: tạo cuộc gọi Voice OTP](https://developers.esms.vn/esms-api/ham-goi-voice/ham-tao-cuoc-goi-voice-otp) hiện đưa ví dụ endpoint gửi SMS `SendMultipleMessage_V4_post_json`, SmsType=8 và mô tả tin cố định. Ví dụ kết quả cũng không nhất quán với nhãn thành công.

**Không dùng nguyên ví dụ này để triển khai cuộc gọi.** Cần support cung cấp endpoint Voice OTP thật, request/response mẫu, cách truyền mã do hệ thống ngoài sinh, callback và bảng cước. Đây là điểm không nhất quán quan sát được trong tài liệu, chưa phải bằng chứng dịch vụ Voice không hoạt động.

## Nối với Supabase và kiến trúc PicKet

Hướng đề xuất, chưa triển khai:

`Supabase Auth → Send SMS Hook có xác thực → Dart API → provider → người dùng nhập mã → Supabase verify`

[Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook) cung cấp mã để gửi qua provider tùy chỉnh. Không điền key eSMS/OMICall vào form Twilio. Giữ một nguồn sinh/xác minh mã là Supabase; không trộn mã provider tự sinh vào cùng flow.

Nếu dùng Voice, phải kiểm chứng TTS đọc từng chữ số, giữ số 0 đầu; thời gian gọi phải nằm trong hạn OTP. Không coi nhấc máy hoặc API thành công là xác minh SĐT. Cần giới hạn tần suất, chống gửi trùng, tránh log OTP và xác nhận khả năng tắt/che ghi âm, transcript hoặc lịch sử TTS chứa mã. Đây là yêu cầu thiết kế dự kiến, chưa kiểm thử provider.

## Nội dung gửi support để chốt

> Tôi là developer cá nhân phát triển ứng dụng PicKet, chưa có đăng ký kinh doanh. Tôi cần gửi OTP 6 số xác minh số điện thoại +84, khoảng 100–1.000 tin/tháng, không gửi quảng cáo. Mã do Supabase Auth sinh. Xin xác nhận có cấp tuyến SMS đầu số cố định/sender dùng chung hoặc Voice OTP cho cá nhân không; hồ sơ, mẫu tin, nhà mạng được hỗ trợ và thời gian kích hoạt? Xin báo giá OTP riêng theo nhà mạng, VAT, phí cố định/đầu số/TTS, nạp tối thiểu, phí thất bại/gửi lại và chính sách hoàn tiền. API có nhận mã của tôi không? Xin endpoint production, mẫu POST JSON, callback và cách test trước khi nạp tiền.

eSMS: [website chính thức](https://esms.vn/), hotline **0901 888 484**, email **cs@vihatgroup.com**. OMICall: [website chính thức](https://omicall.com/), email **contact@omicall.com**. Chưa liên hệ thay người dùng.

Quyết định tiếp theo: lấy xác nhận eligibility và báo giá eSMS trước, sau đó mới làm PoC gửi ít tin trên các nhà mạng cần dùng. Chưa thay nhà cung cấp trong kế hoạch sản phẩm hoặc cấu hình Supabase.
