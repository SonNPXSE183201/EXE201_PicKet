# Hồ sơ biên tập giáo trình — 27/10/2026

[Giáo trình và lộ trình](README.md) · [Trạng thái dự án](../PROJECT_STATUS.md)

## Nội dung đã hoàn thiện

- 12 bài đầy đủ bằng VI/EN, 6 chương; thân bài VI giữ 350–500 đơn vị cách trắng mỗi bài.
- 36 câu quiz và 108 lời giải lựa chọn cho mỗi ngôn ngữ.
- 36 điểm ghi nhớ, 12 hiểu lầm thường gặp và 12 bài tự kiểm tra có lời giải từng bước cho mỗi ngôn ngữ.
- 60 phép kiểm số học chạy thành công; cùng biểu thức/kết quả ở hai bản dịch.
- 12 hoạt động tự chọn, không bắt buộc chi tiền hoặc cung cấp dữ liệu cá nhân.
- Bản đọc Markdown và JSON app đồng bộ qua generator. Không dùng API/provider để soạn hoặc chấm câu trả lời cá nhân trong lượt này.

Bản biên tập mới tận dụng bài đọc đã có, thêm tình huống riêng và lời giải; không thay đáp án quiz hoặc tự cấp thêm XP. Ví dụ mới là dữ liệu hư cấu do Picket biên soạn.

## Nguồn chính thức đã mở và đối chiếu lại trong lượt này

| Nguồn | Nội dung dùng để kiểm | Giới hạn |
| --- | --- | --- |
| [CFPB: Your Money, Your Goals](https://www.consumerfinance.gov/consumer-tools/educator-tool/your-money-your-goals/toolkit/) | Theo dõi thu/chi và lập kế hoạch | Không nhập cơ chế phúc lợi hoặc tín dụng Mỹ |
| [CFPB: Cash flow budget](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_cash_flow_budget_tool_2018-11_ADA.pdf) | Số đầu kỳ, thứ tự thời gian và số cuối kỳ | Không coi tiền thu sau hạn là đã có trước hạn |
| [CFPB: Savings plan](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_savings_plan_tool_2018-11_ADA.pdf) | Chia phần cần dành theo số kỳ | Mức góp là giả định, không bắt buộc |
| [CFPB: SMART goals](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_SMART-goals_tool_2018-11.pdf) | Mục tiêu cụ thể, theo dõi được và điều chỉnh được | Không hứa chắc đạt mục tiêu |
| [CFPB: Needs and wants](https://www.consumerfinance.gov/consumer-tools/educator-tool/youth-financial-education/teach/activities/budgeting-needs-and-wants/) | Phân biệt theo mục đích, thảo luận lựa chọn | Nguồn hoạt động thanh thiếu niên hỗ trợ khái niệm; Picket dùng ví dụ người lớn |
| [CFPB: Emergency fund](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/) | Quỹ cho chi phí ngoài kế hoạch | Không đặt mức dự phòng bắt buộc cho mọi người |
| [CFPB: Comparing auto loans](https://files.consumerfinance.gov/f/documents/cfpb_your-money-your-goals_auto_loans_tool_2018-11_ADA.pdf) | So chi phí, thời hạn và khoản trả | Không giới thiệu khoản vay hoặc áp quyền pháp lý Mỹ |
| [FTC: Trials and renewals](https://consumer.ftc.gov/articles/getting-and-out-free-trials-auto-renewals-and-negative-option-subscriptions) | Đọc điều kiện dùng thử, giá và cách hủy | Không hứa quyền hủy/hoàn tiền tại Việt Nam |
| [Bộ Công an: Cảnh báo giả mạo hoàn tiền](https://www.bocongan.gov.vn/bai-viet/xuat-hien-thu-doan-lua-dao-moi-khi-mua-hang-online-1790562304) | Chi tiết đơn hàng không chứng minh danh tính; cảnh giác OTP/link/quyền điều khiển | Không hứa thu hồi được tiền |

Các PDF được đọc bằng trích xuất văn bản; không sao chép bảng hay ví dụ gốc. Phép tính VND, tên nhân vật, câu hỏi và lời giải được soạn riêng. Ngày accessedAt trong sourceRegistry gốc vẫn giữ 23/10; bảng này ghi đúng các nguồn đã kiểm lại ngày 27/10, không giả cập nhật mọi URL.

## Kiểm tra

- Test RED tái hiện thiếu nội dung tự kiểm tra song ngữ và thiếu phép kiểm mới: a5513c58.
- Bổ sung generator dùng chung, dữ liệu hư cấu và các bản đọc/app tương ứng.
- Learning: 65/65 PASS. Toàn repo: 10 landing, 894 mobile, 54 web, 140 API và 13 bộ SQL PASS.
- Mobile typecheck PASS; lint 0 lỗi/27 warning hiện hữu.
- App JSON và canonical docs JSON bằng nhau; ID, version quiz, đáp án, tiền tệ và biểu thức VI/EN được kiểm.
- Ngày review độc lập vẫn null và publication gate vẫn false.

## Đưa vào sử dụng

Có thể dùng ngay các bản Markdown để đọc, tự giải và góp ý. Source mobile dùng ví dụ mở rộng trong phần ví dụ hiện có của màn learning preview; không thêm luồng mua hoặc gọi AI.

Bản code 18 đã upload trước lượt biên tập nên chưa chứa phần bổ sung. APK/AAB code 19 được build từ source có bản biên tập 2. Không tự bật route học production hoặc công bố đáp án cloud. Closed test giữ draft theo lựa chọn của chủ dự án.
