# Khảo sát SMS OTP cho PicKet và Supabase tại Việt Nam

Ngày tra cứu: **03/11/2026 (Asia/Saigon)**. Phạm vi: developer cá nhân chưa có đăng ký kinh doanh; giữ Supabase Auth, đăng nhập SĐT + mật khẩu, xác minh SĐT bằng OTP. Đây là khảo sát tài liệu và bảng giá công khai, chưa đăng ký/nạp tiền, thử gửi SMS hoặc được provider xác nhận eligibility riêng cho PicKet. Chưa thay cấu hình Auth hoặc quyết định thay Zalo trong kế hoạch sản phẩm.

## 1. Kết quả chính

- Trong ảnh Supabase người dùng cung cấp, Enable Phone provider và Enable phone confirmations đang ON trong form. Để hoạt động cần credentials provider hợp lệ và Save; ảnh không chứng minh cấu hình đã lưu hoặc SMS đã gửi được.
- Lấy được API key không đồng nghĩa được gửi production tới mọi số +84. Cần xác nhận tài khoản cá nhân, tuyến gửi, sender/template, số dư và phạm vi nhà mạng trước khi nạp tiền cho production.
- Các lựa chọn cũ trong dropdown không có mức khả dụng ngang nhau: Textlocal Messenger đã thông báo ngừng; Bird mới và MessageBird legacy khác account/API/key. Xem các nguồn ở mục 2.
- Với ngân sách nhỏ: hỏi SpeedSMS và eSMS trước để lấy báo giá và xác nhận chấp nhận cá nhân. Nếu được chấp nhận, tích hợp bằng Send SMS Hook của Supabase qua Dart API. Muốn thử một lựa chọn tích hợp sẵn, có thể khảo sát Twilio Verify bằng số test được phép trước; chưa kết luận tuyến Việt Nam hoặc production sẽ được cấp cho cá nhân.

## 2. So sánh nhà cung cấp

| Lựa chọn | Giá gửi Việt Nam tìm được | Tích hợp với Supabase | Điều kiện/chỗ chưa xác minh |
|---|---|---|---|
| Twilio SMS | **0,2852 USD/segment**, giá niêm yết international/alphanumeric | Dropdown Twilio: Account SID, Auth Token, Messaging Service SID | Việt Nam yêu cầu đăng ký sender/template; hồ sơ sender có yêu cầu về đơn vị và quyền sở hữu tên. Chưa xác nhận PicKet cá nhân được duyệt production. |
| Twilio Verify | **0,05 USD/xác minh thành công + phí kênh SMS theo đích** | Dropdown Twilio Verify, dùng Verify Service SID | Có quản lý OTP/tuyến gửi; giá SMS Việt Nam cần đối chiếu cho tài khoản/use case. Không áp giá SMS Mỹ cho Việt Nam. |
| MessageBird legacy | Chưa xác minh được giá Việt Nam áp dụng cho account legacy của user | Dropdown Messagebird dùng MessageBird access key | Không dùng key Bird mới thay key legacy. Cần xác nhận còn mở account/tuyến phù hợp và báo giá. |
| Bird mới | **0,26 USD/segment**, alphanumeric, trên trang giá VN | Cần adapter/hook cho API mới; không dùng trực tiếp dropdown Messagebird | Phí carrier/registration tách riêng; cần xác nhận identity/sender/destination cho account cá nhân. |
| Vonage SMS | Chưa chốt được giá VN công khai cho tài khoản; lấy CSV ở Billing → Pricing | Dropdown Vonage: API key/secret và sender | Có yêu cầu đăng ký sender/nội dung Việt Nam; cần hỏi support về cá nhân và tuyến được cấp. |
| Textlocal | Không dùng bảng giá cũ làm dự toán mới | Có tên trong dropdown nhưng chưa chứng minh còn dịch vụ tương thích | Trang sunset thông báo Messenger dừng 30/11/2025; Textlocal India dừng 31/10/2025. Không chọn cho triển khai mới dựa riêng vào dropdown. |
| SpeedSMS | Trang công khai: **750đ/SMS** sender mặc định Verify; thêm gói random **250–300đ/SMS** | Send SMS Hook + adapter Dart | Trang dịch vụ nêu cá nhân/tổ chức và OTP. Bảng giá không ghi ngày hiệu lực, có footer cũ; phải xác nhận còn cung cấp đúng sản phẩm, nhà mạng, sender, VAT, mẫu và giá hiện hành. Chưa khuyến nghị tuyến random. |
| eSMS | Giá SMS/OTP theo báo giá tài khoản; chưa có đơn giá hiện hành xác nhận cho PicKet | Send SMS Hook + adapter Dart | Có tài liệu lấy ApiKey/SecretKey; việc cấp key không xác nhận đủ điều kiện gửi live. Cần hỏi hồ sơ cá nhân, sender/template, giá và nạp tối thiểu. |

Nguồn giá:

- [Twilio SMS Việt Nam](https://www.twilio.com/en-us/sms/pricing/vn): tính theo segment, có thể có phí bổ sung; thuê số nếu dùng tính riêng.
- [Twilio Verify](https://www.twilio.com/en-us/verify/pricing): phí xác minh cộng phí kênh; gửi lại có thể làm tăng cước dù user không hoàn thành. Mô hình custom-code có điều khoản phí khác, cần kiểm tra nếu thay adapter.
- [Bird SMS Việt Nam](https://bird.com/pricing/sms/vn): 0,26 USD/segment; carrier/registration tính riêng. Giá này không phải báo giá cho account MessageBird legacy.
- [Vonage: tải giá theo tài khoản](https://developer.vonage.com/en/dashboard/control/pricing): CSV có giá theo nhà mạng/đích; không lấy mức “from” của thị trường khác làm giá Việt Nam.
- [Textlocal sunset](https://textlocal.com/sunset/).
- [SpeedSMS: giá sender mặc định và random](https://speedsms.vn/bang-gia-dich-vu-tin-nhan-hien-thi-dau-so/), [đối tượng cá nhân/tổ chức và OTP](https://speedsms.vn/dich-vu-tin-nhan-hien-thi-dau-so/).
- [eSMS: cách tính chi phí và báo giá theo tài khoản](https://esms.vn/Tin-Tuc/tin-cong-nghe/1-tin-nhan-sms-bao-nhieu-tien).

Nguồn về khả dụng:

- [Twilio: tuyến Việt Nam](https://www.twilio.com/en-us/guidelines/vn/sms), [hồ sơ đăng ký sender Việt Nam](https://help.twilio.com/articles/360040339113). Yêu cầu provider phân loại đúng OTP ứng dụng ghi chép chi tiêu; chưa kết luận PicKet là ngân hàng/tổ chức tài chính chỉ vì tên tính năng.
- [Vonage: hạn chế/tuyến Việt Nam](https://api.support.vonage.com/hc/en-us/articles/204017273-Vietnam-SMS-Features-and-Restrictions).
- [Bird: khác biệt MessageBird và tài khoản mới, có giải thích riêng cho Supabase](https://bird.com/docs/knowledge-base/account/coming-from-messagebird).

## 3. Dự toán để so sánh

Giả định mỗi lần gửi có **một SMS segment**, không retry. Với USD, dùng **26.000đ/USD làm giả định tính toán**, không phải tỷ giá ngân hàng hiện hành. Chưa cộng thuế/phí chuyển đổi, carrier, đăng ký sender, thuê số, dịch vụ bổ sung, Supabase hoặc hosting nếu phát sinh. Dòng SpeedSMS chỉ là phép nhân theo giá website, không phải báo giá đã xác nhận.

| Lựa chọn | 100 lần gửi | 1.000 lần gửi | 10.000 lần gửi |
|---|---|---|---|
| Twilio SMS | 28,52 USD ≈ 741.520đ | 285,20 USD ≈ 7.415.200đ | 2.852 USD ≈ 74.152.000đ |
| Bird mới | 26 USD ≈ 676.000đ | 260 USD ≈ 6.760.000đ | 2.600 USD ≈ 67.600.000đ |
| SpeedSMS Verify, giá cần xác nhận | 75.000đ | 750.000đ | 7.500.000đ |

Twilio Verify tính riêng: `số SMS gửi × giá SMS VN thực tế + số xác minh thành công × 0,05 USD`. Ví dụ 1.000 xác minh thành công thêm **50 USD** phí xác minh, ngoài cước SMS. Không khẳng định giá SMS Verify giống mọi bảng giá/contract Programmable SMS.

Ngân sách thực tế phụ thuộc tổng số lần gửi, không chỉ user đăng ký: resend, recovery, đổi SĐT, step-up, người không hoàn tất và spam đều có thể phát sinh cước. Nội dung Unicode/dài có thể tăng số segment. Dùng mẫu OTP ngắn có tên PicKet; xác nhận mẫu/encoding với provider và đo cước thật trước dự toán lớn.

## 4. Lấy key và điền Supabase

### Twilio SMS — đúng lựa chọn đang mở trong ảnh

1. Đăng ký/đăng nhập [Twilio Console](https://console.twilio.com/). Hoàn tất các bước xác minh tài khoản được yêu cầu.
2. Vào Account dashboard/Account Info để lấy Account SID và Auth Token. Account SID bắt đầu `AC`.
3. Vào Messaging → Services, tạo service cho PicKet; lấy Messaging Service SID bắt đầu `MG`.
4. Thêm sender có thể gửi tới Việt Nam vào Sender Pool; hoàn tất hồ sơ sender/template/tuyến theo yêu cầu. Service trống hoặc chỉ có key chưa đủ để phát SMS.
5. Trong Supabase chọn Twilio, điền ba ô tương ứng. Content SID là cho WhatsApp theo form đang mở; gửi SMS thì để trống ô tùy chọn đó.
6. Giữ xác nhận phone ON, OTP length 6; đề xuất expiry 180 giây thay mức 60 giây trong ảnh để thử delivery. Save sau khi credentials hợp lệ; đặt rate limit/CAPTCHA và giới hạn chi tiêu provider.

Nguồn: [Account SID/Auth Token](https://www.twilio.com/docs/salesforce/install), [Messaging Service/Sender Pool](https://help.twilio.com/articles/223181308), [phone auth Supabase](https://supabase.com/docs/guides/auth/phone-login). SID là định danh tài nguyên; Auth Token là bí mật, không lấy một API key bất kỳ thay vào ô Auth Token.

### Twilio Verify — một cấu hình khác với Twilio SMS

1. Dùng Account SID/Auth Token như trên.
2. Twilio Console → Verify → Services → tạo service PicKet, chọn mã 6 số; lấy Verify Service SID bắt đầu `VA`.
3. Supabase đổi dropdown sang **Twilio Verify**, điền credentials và Verify Service SID vào ô service mà form yêu cầu. Không dùng `MG` của Messaging cho Verify hoặc `VA` cho Twilio SMS.
4. Kiểm tra cấu hình độ dài/TTL/template của Verify; không giả định mọi cài đặt OTP của Supabase tự ghi đè provider. Trial yêu cầu xác minh các số nhận không thuộc Twilio; chỉ test trên số của mình được phép trước. Availability Việt Nam và hồ sơ production phải được provider xác nhận.

Nguồn: [Twilio Verify](https://www.twilio.com/docs/verify), [trial Verify](https://www.twilio.com/docs/usage/trials/try-out-verify), [adapter Supabase Verify](https://github.com/supabase/auth/blob/master/internal/api/sms_provider/twilio_verify.go). Đây là xác minh mã do Verify quản lý, không suy từ provider Twilio SMS thường.

### Vonage / MessageBird / provider nội địa

- **Vonage:** đăng ký Vonage API Dashboard → Settings → API Settings → lấy API key và secret; chọn Vonage trong Supabase, nhập các trường tương ứng và sender đã được chấp nhận. [Cách lấy credentials](https://developer.vonage.com/en/dashboard/control/api-settings).
- **MessageBird:** cần account/key legacy tương thích `rest.messagebird.com`. Key `bk_...` của Bird mới không dùng cho dropdown này. Nếu dùng Bird mới, phải tích hợp API/hook riêng. [Giải thích chính thức](https://bird.com/docs/knowledge-base/account/coming-from-messagebird).
- **eSMS:** tạo tài khoản → Quản lý API → lấy ApiKey/SecretKey; sau đó xác nhận giá, quyền gửi và template. [Hướng dẫn](https://developers.esms.vn/readme/lay-thong-tin-apikey-va-secretkey).
- **SpeedSMS:** đã tìm được tài liệu lấy API access token tại `connect.speedsms.vn`, mục Tài khoản hoặc Settings → Profile tùy tài liệu; chưa đăng nhập kiểm chứng giao diện. FAQ có sender chung Verify/Notify; vẫn cần xác nhận eligibility, cước và quyền live. Xem [khảo sát chuyên sâu](SPEEDSMS_RESEARCH_20261103.md).
- Với eSMS/SpeedSMS/Bird mới, keys được đặt ở backend, **không dán vào các ô Twilio/Vonage**. Dùng [Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook) để chuyển OTP Supabase sinh sang adapter gửi tin trong Dart. Supabase vẫn xác minh mã và cấp phiên. Hook cần xác thực chữ ký/timestamp và kiểm thử timeout/retry/dedup.

## 5. Các câu cần provider trả lời trước khi thanh toán

Có thể gửi nội dung sau qua kênh hỗ trợ của provider; khảo sát này chưa gửi yêu cầu thay user:

> Tôi là developer cá nhân tại Việt Nam, chưa có đăng ký kinh doanh. Tôi phát triển PicKet, ứng dụng ghi chép thu chi cá nhân, cần gửi SMS OTP 6 số xác minh SĐT. Dự kiến ban đầu 100–1.000 SMS/tháng. Xin xác nhận có chấp nhận khách hàng cá nhân không; cần hồ sơ gì; sender/template nào được phép; gửi được Viettel, VinaPhone, MobiFone không; phí mỗi segment, VAT, nạp tối thiểu, thuê bao/đăng ký và phí tin lỗi/resend là bao nhiêu? Có API gửi nội dung OTP do Supabase sinh sẵn không? Có thể thử trên số của tôi trước khi mua không?

Chỉ chọn provider sau khi có câu trả lời về eligibility và thử delivery/cước trên các mạng mục tiêu. API trả accepted chưa chứng minh máy đã nhận OTP. Tắt OTP test/fixed code ở production; không log mã hay token. Các tài khoản phone-only của PicKet vẫn cần thay đổi code web/mobile và API kiểm tra email trước khi rollout.
