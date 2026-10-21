# Google Play: hoàn tất xác minh, sandbox và production

Ngày đối chiếu tài liệu chính thức: **22/10/2026**. Theo ảnh người dùng cung cấp, **đã đăng ký Play Console cá nhân, đang chờ Google xét duyệt danh tính**. Ảnh Google Payments có dòng phí đăng ký 25 USD; không phải bằng chứng app được duyệt phát hành. Console yêu cầu hoàn tất xác minh danh tính trước khi xác minh số điện thoại. Thẻ xác minh website đã triển khai và commit `2c73b44`, nhưng chưa nhận bằng chứng Google xác minh thành công. Tài liệu này **không xác nhận Billing sandbox đã chạy hoặc thanh toán production đã bật**. Chưa có thao tác mua thật hay đăng ký dịch vụ trả phí được thực hiện thay người dùng.

Các bước đăng ký dưới đây được giữ làm hướng dẫn tham khảo, không yêu cầu đăng ký hoặc trả phí lần nữa. Việc tiếp theo là theo dõi email xét duyệt, hoàn thành xác minh còn lại và chuẩn bị app/track/sandbox. Điện thoại thật chưa được ADB nhận theo kết quả gần nhất; các ca trong checklist thiết bị thật vẫn chưa nghiệm thu. Không bật Cloud Billing hoặc nạp 250.000đ chỉ để xóa cảnh báo: ảnh Billing hiện có cho thấy các tài khoản Closed và project Billing disabled; ảnh tài khoản đã mở có số dư 0đ/No balance due, không chứng minh số dư của mọi tài khoản.

Bản Play cần rà soát loại bỏ cơ chế tải/cài APK cập nhật ngoài Play và dùng cơ chế cập nhật của Play; không coi APK landing là AAB đã đủ điều kiện upload. Xem [chính sách Device and Network Abuse](https://support.google.com/googleplay/android-developer/answer/16559646).

## 1. Việc bạn thực hiện trước

1. Vào [Play Console](https://play.google.com/console/signup), dùng tài khoản Google do bạn kiểm soát lâu dài, bật xác minh hai bước.
2. Chọn loại tài khoản đúng thực tế (cá nhân/tổ chức), điền thông tin pháp lý và liên hệ; hoàn tất các yêu cầu xác minh mà Console hiển thị. Bạn tự nhập giấy tờ/thẻ và chấp nhận điều khoản, không gửi vào chat.
3. Google nêu phí đăng ký một lần **25 USD**; kiểm tra số tiền/điều kiện tại bước thanh toán chính thức trước khi tự trả. [Hướng dẫn đăng ký](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en).
4. Hoàn tất xác minh thiết bị/danh tính theo checklist trên tài khoản của bạn. Không mua tài khoản hoặc dùng thông tin giả để bỏ qua xác minh.
5. Tạo app Picket, loại App, ngôn ngữ và thông tin liên hệ phù hợp. Giữ package **`com.picket.mobile`** khi upload bản chính thức; không dùng `.qa`.
6. Trước khi bán gói, hoàn thành payments profile/merchant, quốc gia, thuế và tài khoản nhận tiền theo Console. Chỉ bạn hoặc người được ủy quyền mới xác nhận các thông tin tài chính này.

## 2. Khóa ký và bản upload — quyết định trước khi upload lần đầu

- APK landing và app Play phải có chiến lược chữ ký tương thích nếu muốn cài đè giữ dữ liệu. Android không cho cập nhật cùng package bằng khóa ký không tương thích.
- Play App Signing phân biệt **app signing key** và **upload key**. Nếu muốn cùng chữ ký giữa landing và Play, khi thiết lập phải chọn phương án dùng khóa app hiện tại theo quy trình bảo mật của Google; không mặc định để Google sinh khóa khác rồi kỳ vọng APK landing cập nhật được bản Play.
- Không gửi file keystore/mật khẩu/PEPK hoặc private key qua chat/GitHub. Việc chuyển khóa vào Play do chủ tài khoản thực hiện qua công cụ chính thức, có bản sao khóa an toàn. [Tài liệu ký app](https://developer.android.com/studio/publish/app-signing).
- Bản public landing **1.0.4 (5)** là APK ARM64. Bản upload Play cần **AAB release** riêng, ABI và versionCode được kiểm tra theo track. Không upload APK QA/probe; không tái dùng một versionCode đã được Play chấp nhận cho artifact khác. [Chuẩn bị release](https://developer.android.com/studio/publish/preparing/).
- Sau khi cấu hình ký, người phụ trách build tạo AAB từ source đã chốt, kiểm tra không debug, package/signing/permissions/public HTTPS, rồi upload Internal testing. Tài liệu này chưa tạo hoặc upload AAB lên Console.

## 3. Tạo đúng bốn sản phẩm Picket

Code hiện dùng **bốn subscription ID độc lập**, không phải chỉ hai sản phẩm Plus/Pro có nhiều chu kỳ. Không tự đổi ID trên Console vì client/verifier sẽ từ chối ID khác.

| Subscription ID | Tier server | Base plan gợi ý | Chu kỳ |
| --- | --- | --- | --- |
| `picket_plus_monthly` | `plus` | `monthly` | Auto-renew hàng tháng |
| `picket_plus_yearly` | `plus` | `yearly` | Auto-renew hàng năm |
| `picket_pro_monthly` | `pro` | `monthly` | Auto-renew hàng tháng |
| `picket_pro_yearly` | `pro` | `yearly` | Auto-renew hàng năm |

1. Trong app → Monetize with Play/Products → Subscriptions, tạo từng ID đúng bảng; đặt tên/mô tả quyền lợi và chu kỳ rõ ràng.
2. Thêm base plan tương ứng, chọn quốc gia và giá bạn muốn bán; kiểm tra tiền tệ/thuế và ngày bắt đầu. Không sử dụng giá ví dụ trong tài liệu làm giá thương mại mặc định.
3. Lưu rồi activate base plan sau khi kiểm tra. Chỉ thêm offer/trial khi đã xác định chính sách và kiểm thử eligibility; giai đoạn đầu nên giữ một base plan/ID để giảm mơ hồ offer.
4. Đối chiếu ID trong `packages/domain-ts`, `apps/api/lib/src/billing_contract.dart`, `supabase/functions/_shared/google_play.ts`. Không thay tên ID đã bán để “sửa nhãn”. [Subscriptions/base plans](https://support.google.com/googleplay/android-developer/answer/140504?hl=en).

## 4. Backend xác minh và cập nhật quyền lợi

Kiến trúc hiện có: Expo `expo-iap` → Dart `/v1/billing/google-play/verify` → Supabase `verify-purchase` → Android Publisher API → `record_play_purchase` → entitlements. Client chỉ finish sau khi server xác minh; không tự cấp Pro từ callback hoặc screenshot thanh toán.

1. Trong Google Cloud project bạn kiểm soát, bật Google Play Android Developer API. Tạo service account dùng cho verifier, cấp quyền app tối thiểu cần thiết trong Play Console để đọc/xử lý subscription và acknowledgement.
2. Nếu dùng JSON private key theo code hiện tại, tạo/lưu an toàn ngoài repo; đưa vào Supabase server secret **`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`**. Không đặt trong `EXPO_PUBLIC_*`, `.env.example`, AAB hay landing.
3. Cấu hình các secret Supabase/Auth hiện có mà shared verifier yêu cầu; không thay khóa production đang dùng chỉ để thử. Kiểm tra bằng tên biến/status, không in giá trị vào log.
4. Deploy `verify-purchase` và `play-notifications` từ source đã kiểm tra vào đúng project. `supabase/config.toml` đặt `verify_jwt=false` cho gateway, nhưng handler tự xác minh: user Supabase ở verifier, Google OIDC ở webhook. **Không được bỏ xác thực trong handler.**
5. Xác nhận migration bảng `play_purchases`, function `record_play_purchase` và entitlement policy đã có trên môi trường mục tiêu. Thử request thiếu token/sai token phải bị từ chối; giao dịch của A không được cấp quyền cho B.
6. Giao dịch hợp lệ mới cấp quyền; server kiểm tra package/product/owner/thời hạn, lưu token hash và acknowledge theo trạng thái. Kết quả mua pending hoặc verify lỗi không được hiện “đã kích hoạt”. [Nguyên tắc tích hợp/xác minh](https://developer.android.com/google/play/billing/integrate).

Không đánh dấu backend Billing ready chỉ vì endpoint trả HTTP 200 với request giả. Cần purchase token thật từ license tester và kiểm tra quyền lợi server sau verification.

## 5. RTDN — gia hạn/hủy/hết hạn khi app không mở

1. Trong Google Cloud tạo Pub/Sub topic riêng cho Picket.
2. Cấp quyền Pub/Sub Publisher trên topic cho **`google-play-developer-notifications@system.gserviceaccount.com`**.
3. Tạo push subscription tới HTTPS endpoint `https://<SUPABASE_PROJECT>.supabase.co/functions/v1/play-notifications`; bật OIDC authentication bằng service account push chuyên dụng. Không dùng một URL webhook công khai không xác thực.
4. Đặt secret **`GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`** đúng email trong OIDC token và **`GOOGLE_PLAY_RTDN_AUDIENCE`** đúng audience được cấu hình trong push subscription. Hai giá trị phải khớp chính xác handler; không nhầm service account Publisher của Google với tài khoản ký push OIDC của bạn.
5. Bảo đảm Pub/Sub có quyền tạo OIDC token cho service account theo IAM của Cloud; không cấp Owner toàn project để xử lý lỗi permission.
6. Trong Play Console → Monetization setup → RTDN, nhập tên topic đầy đủ `projects/<project-id>/topics/<topic>` rồi Send Test Message. Kiểm tra delivery/response và log đã che token; test message thành công chưa chứng minh cập nhật gói.
7. Dùng mua/gia hạn/hủy sandbox để kiểm tra verifier truy vấn trạng thái từ Play và cập nhật entitlement. Không lấy notification làm bằng chứng cấp gói nếu chưa xác minh purchase. [Thiết lập RTDN](https://developer.android.com/google/play/billing/getting-ready), [cấu trúc sự kiện](https://developer.android.com/google/play/billing/rtdn-reference).

## 6. Internal testing và license tester — hai cấu hình khác nhau

1. Upload AAB đã ký lên Internal testing, ghi release notes, giải quyết lỗi Console và rollout riêng track test.
2. Thêm Gmail của bạn vào danh sách tester của track, gửi/mở opt-in URL trên đúng tài khoản Google của điện thoại.
3. **Đồng thời** thêm Gmail đó trong Play Console Settings → License testing. Chỉ được vào internal track không tự có giao dịch miễn phí; thiếu license tester có thể bị tính tiền thật.
4. Trên điện thoại có Play Store, chọn đúng Gmail đã opt-in; cài Picket từ link Play test. Dùng thiết bị phụ hoặc backup/cài đè tương thích chữ ký, không gỡ bản có dữ liệu chưa sync.
5. Mở Picket, đăng nhập tài khoản test Supabase/Google, vào Gói sử dụng. Ghi Gmail Play đang mua và tài khoản Picket đang nhận quyền; chúng là hai ngữ cảnh riêng.
6. Chọn một gói, kiểm tra cửa sổ Play có phương thức **test**. Nếu hiện thẻ thật/không chắc license tester, **hủy ngay**, kiểm tra cấu hình rồi mới thử lại. Không trả tiền để “xem có chạy không”.
7. Dùng Play Billing Lab khi cần kiểm tra grace/account hold/renewal; không bật lựa chọn real payment methods khi mục tiêu vẫn là sandbox. [License testing](https://support.google.com/googleplay/android-developer/answer/6062777?hl=en), [Billing tests/Lab](https://developer.android.com/google/play/billing/test).

APK landing là kênh sideload; quy trình nghiệm thu được chọn ở đây là cài bản Internal testing từ Play để có bằng chứng distribution/Billing nhất quán. Test local/mock/API không thay thế sandbox.

## 7. Ma trận sandbox cần chạy trước production

Với mỗi ca: ghi máy, app versionCode, product ID, trạng thái trước/sau, thời gian và mã đơn đã che bớt. Không công bố purchase token. Tạo dữ liệu chỉ ở tài khoản test; không dùng staff grant để giả thành purchase.

| Ca | Các bước | Kết quả cần thấy |
| --- | --- | --- |
| S01 — Danh mục | Mở Gói, tải lại kết nối Play; đối chiếu 4 ID, giá/chu kỳ bản địa hóa với Console | Chỉ sản phẩm active/offer hợp lệ; không hard-code giá sai |
| S02 — Mua thành công | Free → chọn Plus tháng → phương thức test thành công → chờ server verify | Tier/quota server thành Plus; sau restart vẫn đúng; transaction finish sau verify |
| S03 — Bốn sản phẩm | Chạy tương tự với từng ID trên tài khoản test/cycle sạch thích hợp | Tier và thời hạn đúng ID; không cộng chồng quota vô hạn |
| S04 — Hủy/decline | Mở mua rồi hủy; thử phương thức test luôn từ chối | Không tự cấp gói, UI thoát busy, có thể thử lại |
| S05 — Mất mạng/kill | Mua test, ngắt mạng hoặc force-stop trước phản hồi verify; bật mạng/mở app/Restore | Đúng một purchase, không mất quyền đã trả; verify retry rồi finish, không trùng record |
| S06 — Restore | Đăng nhập lại cùng Picket trên máy test khác, dùng Restore purchases | Server kiểm tra lại quyền; không tạo purchase mới, không đòi trả lại tiền |
| S07 — Owner khác | Sau mua bởi A, đổi sang Picket B rồi Restore cùng purchase Play | Không cấp giao dịch A cho B; lỗi owner an toàn, quay A khôi phục đúng |
| S08 — Gia hạn | Dùng test renewal/Lab, giữ app đóng, chờ RTDN rồi mở | Expiry/tier server cập nhật một lần, quota tuân server |
| S09 — Cancel/hết hạn | Hủy subscription test trong Play, kiểm tra trước và sau expiry | Hủy không nhất thiết mất quyền ngay; hết hạn thực tế trở Free theo dữ liệu Play |
| S10 — Grace/hold | Dùng Lab/payment decline cho renewal, kiểm tra từng trạng thái | Grace/hold có quyền theo verifier/policy; không giữ Pro vô hạn khi hold/expired |
| S11 — Refund/revoke | Refund/revoke **đơn test** trong Console; chờ RTDN, mở app | Entitlement được thu hồi đúng; app không lấy cache cũ để cấp quyền server |
| S12 — Webhook retry | Gửi lại sự kiện test/giữ lỗi ngắn có kiểm soát rồi khôi phục | RTDN retry idempotent, không cấp lặp; OIDC sai bị chặn |
| S13 — Acknowledge | Kiểm tra trạng thái purchase test sau mua và sau verify | Purchase đã được acknowledge, không bị hoàn vì quên ack; không ack giao dịch không hợp lệ |
| S14 — Đổi gói | Thử đường đổi Plus↔Pro mà app hiện hỗ trợ, đọc rõ hộp Play về hiệu lực/giá | Nếu chưa có replacement flow đã nghiệm thu, ghi BLOCKED, không quảng cáo nâng/hạ gói liền mạch |

Tốc độ gia hạn và vòng đời test do Play/Lab điều khiển; xem thông số hiện hành trong [tài liệu test](https://developer.android.com/google/play/billing/test), không dùng thời gian sandbox để mô tả chu kỳ thương mại.

## 8. Từ sandbox sang production

1. Hoàn thành các ca trên, lưu báo cáo và sửa mọi lỗi tiền/quyền/owner/ack. Hoàn thành [checklist Android thật](ANDROID_REAL_DEVICE_CHECKLIST.md).
2. Hoàn thiện store listing, ảnh thật, privacy policy, Data safety, content rating, khai báo app access/quyền và yêu cầu chính sách trong Console. Không đánh dấu thu thập dữ liệu bằng phỏng đoán; OCR cloud gửi ảnh khi consent, Auth/Storage xử lý dữ liệu phải phản ánh đúng sản phẩm.
3. Nếu là tài khoản cá nhân mới thuộc yêu cầu của Google: chạy **closed testing ít nhất 12 tester opt-in liên tục 14 ngày**, sau đó xin production access. Internal testing hoặc license testing không tự thay thế yêu cầu này. Làm đúng checklist được Console hiển thị cho loại tài khoản của bạn. [Điều kiện production cho tài khoản cá nhân mới](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [các track thử nghiệm](https://support.google.com/googleplay/android-developer/answer/9845334?hl=en).
4. Kiểm tra giá/quốc gia/quyền lợi, điều khoản gia hạn/hủy và contacts hỗ trợ. Không xóa sản phẩm đã có người mua để thay ID.
5. Tạo release production với versionCode hợp lệ cao hơn bản đã dùng khi cần, submit review. Chỉ rollout khi được phê duyệt; dùng rollout theo giai đoạn nếu Console cho phép với loại release đó, theo dõi crash/ANR/verifier/RTDN.
6. License tester tiếp tục dùng phương thức test; muốn kiểm tra giao dịch thương mại, cần một kế hoạch được chủ tài khoản đồng ý riêng, tài khoản/phương thức thật và chấp nhận khoản thu/phí. Không tự mua thật trong quá trình Codex kiểm thử.
7. Theo dõi entitlement ngay sau mua, renewal/cancel/refund khi app đóng; có quy trình hỗ trợ người đã trả tiền nhưng verify lỗi. Không bật production nếu backend secrets/RTDN chưa thực sự hoạt động.

## 9. Hiện còn thiếu để tôi triển khai tiếp Billing

- Bạn đăng ký/xác minh Play Console và payments profile, tạo app, chọn chiến lược khóa ký.
- Có AAB Internal testing, bốn subscription/base plan active và Gmail license tester.
- Quyền service account Android Publisher, server secret an toàn, Pub/Sub topic/push OIDC và RTDN.
- Điện thoại cài từ Play, báo cáo S01–S14. Chưa có các đầu vào này thì trạng thái Billing là **implemented, chưa sandbox verified**, không phải payment production ready.

Không cần gửi secret vào chat. Khi có Console, bạn có thể mở trang cần cấu hình và cung cấp quyền phù hợp; các bước thanh toán/xác minh pháp lý do bạn xác nhận.
