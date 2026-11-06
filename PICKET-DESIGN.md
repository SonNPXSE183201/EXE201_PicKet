# Picket — Design System duy nhất

Cập nhật **28/10/2026**. Đây là nguồn chuẩn thiết kế cho mobile, landing và web/admin. Không duy trì thêm DESIGN.md hoặc proposal thiết kế độc lập. Source runtime là nguồn token thực thi; tài liệu này không thay đổi nghiệp vụ hoặc tự xác nhận một ca nghiệm thu đã PASS.

[Trạng thái hiện hành](docs/PROJECT_STATUS.md) · [Backlog](docs/BACKLOG.md) · [Kiến trúc](docs/ARCHITECTURE.md).

## 1. Nhận diện và ranh giới

Picket Paper dùng giấy kem, tím mận, túi pastel và minh họa giấy cắt. Chữ tròn, rõ tiếng Việt; số tiền có dấu/nhãn để không phụ thuộc riêng màu. Mobile, landing, ba trang xác thực web (login/register/forgot-password) và hậu đài admin dùng Paper. Admin giữ cấu trúc workspace, áp token trong `.workspace-admin` và `.admin-platform`; dashboard người dùng không đổi palette.

- Expo là ứng dụng Android chính thức. Không dùng mockup Nomad cũ làm bản thiết kế mặc định mới.
- Theme = palette × light/dark/system. Paper là mặc định cài mới; Nomad, Rose, Ocean và lựa chọn đã lưu vẫn tương thích.
- Landing phục vụ tìm hiểu/tải Android. Web cần tài khoản và mạng; không quảng cáo có guest/offline như native.
- Không thêm quy tắc tài chính vào presentation hoặc gọi Supabase trực tiếp để thực thi nghiệp vụ. Mọi thay đổi số dư, split, rollover và quyền do Dart API/domain quy định.
- Báo cáo nghiệm thu theo ngày là lịch sử, không phải một design system thứ hai.

## 2. Mobile Paper: màu sắc

Nguồn: [themes.ts](apps/mobile/src/core/theme/themes.ts), [mobile-theme-adapter.ts](apps/mobile/src/core/theme/mobile-theme-adapter.ts). Dùng semantic role, không kiểm tra tên palette trong từng màn.

| Vai trò | Sáng | Tối |
| --- | --- | --- |
| Canvas | `#FFF8ED` | `#211C23` |
| Surface | `#FFFCF5` | `#302732` |
| Elevated | `#FBEBDD` | `#3B303D` |
| Text | `#302132` | `#F7EEE7` |
| Muted | `#72636E` | `#C6B6C4` |
| Primary / link | `#793268` | `#E4A3D3` |
| On primary | `#FFFFFF` | `#302132` |
| Primary pressed | `#622653` | `#D38FC1` |
| Border trang trí | `#EADDD5` | `#534452` |
| Control border | `#94818D` | `#A58EA0` |
| Selected surface | `#FDE6D8` | `#503C50` |
| Selected text | `#793268` | `#F3C3E7` |
| Pocket coral | `#FFB4A2` | `#593D3B` |
| Pocket mint | `#BCE0B4` | `#344D40` |
| Pocket blue | `#B8D8E2` | `#334A56` |
| Pocket lilac | `#DDCBE8` | `#4B3C59` |
| Camera | `#793268` | `#793268` |
| On camera | `#FFFFFF` | `#FFFFFF` |
| Income | `#116044` | `#78DDB6` |
| Expense | `#9F2545` | `#FF9CB4` |

Màu túi biểu thị nhóm hiển thị, không tự hàm ý trạng thái an toàn/lỗi. Input dùng controlBorder; border nhạt chỉ phân chia surface. Giữ label, dấu +/- và phản hồi chữ cho trạng thái nghiệp vụ.

## 3. Typography, hình khối và mật độ mobile

Nguồn: [paper-foundations.ts](apps/mobile/src/core/theme/paper-foundations.ts), [mobile-palette.ts](apps/mobile/src/core/ui/mobile-palette.ts), [PicketText](apps/mobile/src/core/ui/picket-text.tsx), [PicketTextInput](apps/mobile/src/core/ui/picket-text-input.tsx).

- Nunito local 400/600/700/800, đầy đủ tiếng Việt và giấy phép trong assets/fonts. Chờ font khi mở app; lỗi font phải có fallback, không giữ splash vô hạn.
- Số dư/amount lớn 32–38 tùy vai trò; tiêu đề màn 24–26; section khoảng 18; body/input 14–16; caption 12–13. Không ép cùng cỡ lên số tiền và metadata.
- Surface radius **22dp**, padding **16dp**; input radius **14dp**; button radius **24dp**; chip radius **14dp**; sheet **28dp**. Đây là geometry đã thu gọn ngày 27/10, thay thế số 30/18/28/18 trong proposal cũ.
- Control chính min-height **48dp**; không khóa height khi chữ lớn. ChoiceChip có pill nhỏ trong pressable 48dp; không thu vùng chạm theo hình pill.
- Lề màn 20dp, field gap 16dp, row 12dp, compact 8dp, section 24dp. Giới hạn chiều rộng nội dung trên màn lớn theo shared screen, không kéo form vô hạn.
- PicketScrollView tính khoảng tránh dock/safe area theo route và font scale. Không thêm spacer tùy tiện cho từng màn.
- Playwrite VN chỉ dùng chữ trang trí; Fredoka không thay Nunito trong form, giao dịch hay số tiền. Text lồng nhau kế thừa vai trò của cha.

## 4. Điều hướng và màn hình mobile

Nguồn: [navigation-shell.tsx](apps/mobile/src/core/ui/navigation-shell.tsx), [navigation-layout.ts](apps/mobile/src/core/ui/navigation-layout.ts), [picket-ui.tsx](apps/mobile/src/core/ui/picket-ui.tsx).

Dock năm đích: **Nhà / Chi tiêu / Chụp / Dự định / Picket**. Chụp nằm giữa, giữ hình khác biệt để dễ tìm camera; không thêm chấm chọn dư. Màn chi tiết/form dùng back của TopAppBar, không sao chép header riêng và không chồng hai nút quay lại.

| Nhóm | Quy tắc |
| --- | --- |
| Nhà | Header/ngày/lời chào → tổng số dư với cây → nhịp chi/Cất tiền → tối đa 3 túi → tối đa 3 giao dịch. Không nhét khối công cụ phụ vào Nhà |
| Quyền riêng tư số dư | Nút mắt chỉ ẩn tổng số dư; không âm thầm ẩn biểu đồ/túi/giao dịch. Đồng bộ nền không thay dữ liệu đang có bằng spinner |
| Nhịp chi | Giữ ngày và tiền tệ được chọn; có loading/rỗng/lỗi. Chọn ngày mở giao dịch đúng ngày địa phương/kind/currency. Đổi tháng bỏ ngày cũ |
| Cất tiền | Mở form chuyển ví, không tự điền số tiền hoặc thực hiện giao dịch. Chưa đủ ví cùng tiền tệ thì hướng dẫn thêm ví |
| Túi ngân sách | Hai túi trên, túi thứ ba lệch phải theo mẫu; màn hẹp/chữ lớn xếp một cột. Tên/hình/màu tùy chỉnh owner-local mã hóa; chưa đồng bộ appearance cloud |
| Chi tiêu | Hàng phẳng, badge như Nhà; filter/search thu gọn mặc định, tự mở khi có deep-link filter. Công cụ/bulk vẫn truy cập được |
| Dự định | Control/chip cùng shared geometry; tên tháng xuống dòng không đè mũi tên. Giữ logic transfer/split/refund/close/rollover |
| Cá nhân | Thẻ hồ sơ ngang, menu/toggle gọn. Toggle tự lưu, không thêm nút lưu dư. Tên có giới hạn dòng, cloud email có ellipsis |
| Đăng xuất | Đọc pending/conflict đúng owner; queue trống dùng xác nhận trung tính. Không xóa outbox/bản nháp hoặc hiển thị dialog cũ sau đổi owner |
| Cập nhật | Không hiện recheck cạnh download/install/Play handoff. APK direct có updater; Play build loại installer và quyền cài APK |
| Camera/hóa đơn | Camera xin quyền riêng; gallery dùng system picker. Người dùng rà OCR trước lưu. Ảnh hóa đơn giữ nguyên; lỗi/nhập thủ công có đường phục hồi |
| Bộ sưu tập | Ảnh, giá mua, ngày, hạn đổi trả/bảo hành; hai hạn nhập thủ công. Không quảng cáo tự liên kết hóa đơn khi vẫn là hai mục riêng |
| Trạng thái | Màn auth/onboarding/form/list/detail có loading, empty, error, retry, busy và confirmation phù hợp. Không báo thành công giả khi còn pending |

### Gói và hạn mức OCR

Màn gói dùng nền Paper, font chung, thẻ bo 22dp/padding 16dp và nút chạm 48dp. Thẻ đầu hiển thị cấp gói, số lượt cloud còn lại và thanh tỷ lệ; không dùng hình ảnh thay số liệu server. Biểu tượng mầm cây cho Free, ngôi sao cho Plus và vương miện cho Pro dùng bộ icon hiện có, nền pocket blue/mint/lilac, hỗ trợ sáng/tối.

Chuyển tháng/năm bằng segmented tabs; mỗi lần so sánh hai thẻ Plus/Pro thay vì xếp bốn nút mua nối tiếp. Giá và offer luôn lấy từ Google Play. Nhãn cùng cấp gói hiện tại chỉ mô tả tier, không khẳng định chu kỳ đang đăng ký. Hạn mức cloud Free/Plus/Pro là 3/30/100 trong cửa sổ 24 giờ; quét trên máy không trừ lượt cloud. Khi hết lượt phải giữ hướng dẫn quét local/nhập tay. Khôi phục/tải lại bảng giá/quản lý gói nằm sau phần so sánh; không che lỗi hoặc giả kích hoạt khi server chưa xác minh.

## 5. Asset và mở rộng

Nguồn: [paper-assets.ts](apps/mobile/src/core/theme/paper-assets.ts), [category-art.ts](apps/mobile/src/core/theme/category-art.ts), [PaperArt](apps/mobile/src/core/ui/paper-art.tsx).

Asset đóng gói trong `apps/mobile/assets/paper`; không import từ Downloads hoặc thư mục tham khảo root. ID hiện có gồm bloom, food, transport, leisure, shopping, home, health, gift, receipt. Minh họa chỉ trang trí; label và số tiền luôn là Text đọc được. Dark mode không đảo màu ảnh.

1. Chọn asset có quyền sử dụng, tên kebab-case/version; PNG/WebP alpha khi cần nền trong suốt.
2. Đăng ký bằng literal require để Metro đóng gói, thêm label VI/EN và ID ổn định.
3. Mapping danh mục/tên dùng adapter; lựa chọn đã lưu được ưu tiên hơn fallback.
4. Màn dùng shared component, không sao chép đường dẫn và style cho mỗi nơi.
5. Kiểm crop, tỷ lệ, bundle, hai mode, chữ lớn và nhãn screen reader. Font mới cần file license đi kèm.

Không thêm nền giấy raster phủ toàn app nếu làm mất tính flat. Không dùng ảnh AI thay screenshot native trong bằng chứng nghiệm thu. Ảnh marketing có mock frame hoặc dữ liệu tổng hợp phải được nhận diện là minh họa.

## 6. Landing public

Nguồn: [HTML](apps/landing/site/index.html), [Paper CSS](apps/landing/site/launch-assets/paper-v1.css), [motion CSS](apps/landing/site/launch-assets/paper-motion-v1.css), [motion JS](apps/landing/site/launch-assets/paper-motion-v1.js).

- Dùng Nunito local 400/700 và Paper light. Hero chữ lớn, ảnh native, lớp giấy/phiếu ví dụ; vùng tải là mục tiêu chính.
- Header: logo, Tính năng/Cách cài đặt/Liên hệ, **Đăng nhập nền tím/chữ trắng**. Không có nút Tải ứng dụng ở header.
- Hero: **chỉ Tải APK Android**, không có Đăng nhập cạnh CTA. Không có chấm trước câu “Tiền có chỗ. Bạn có khoảng thở” hoặc gạch ngang trước story-tag.
- Nội dung: giá trị → tính năng → kỷ vật/bảo hành → story ba màn → mô phỏng khoản chi → offline/sao lưu → tải/checksum → cài đặt → FAQ → hỗ trợ/footer.
- Motion tự khởi chạy, không có nút bật/tắt. Hoa trang trí chạy một lượt 4,5s; con trỏ/cuộn phản hồi trong giới hạn nhỏ. Tôn trọng OS reduced motion. Không scroll-jacking, autoplay video hoặc phụ thuộc WebGL.
- Story dùng sticky trên desktop và nút chọn trực tiếp; mobile cuộn bình thường. Mô phỏng có nhãn ví dụ, chỉ giữ bộ nhớ trang, không ghi tài khoản hoặc gọi API.
- Link section cuộn tới nội dung mà không thêm hash khi JS hoạt động; giữ focus, query string và no-JS anchor fallback. Deep link cũ vẫn được xử lý.
- Footer có sản phẩm, hướng dẫn/chính sách, phiên bản, email, điện thoại, Facebook/YouTube và copyright; không tạo thông tin pháp nhân/đánh giá chưa xác minh.
- Bảng Hỗ trợ dùng HTML Popover, đóng bằng ×/Escape/bấm ngoài. Kênh liên hệ vẫn có ở footer. CSS/JS/font chỉ từ cùng origin theo CSP.
- APK/metadata/checksum lấy từ `release.json`, không gõ link phiên bản thủ công. Hình Paper có thể minh họa source mới nhưng không được giả là nghiệm thu phần cứng.

## 7. Next.js cloud và admin

### Xác thực web Paper

Nguồn: [auth-shell.tsx](web/src/features/auth/components/auth-shell.tsx), [auth-paper.css](web/src/features/auth/auth-paper.css). Áp dụng riêng cho `/login`, `/register`, `/forgot-password` theo yêu cầu 28/10/2026.

- Header có logo và “Về trang chủ”, cùng dẫn trực tiếp `https://picketfinance.com/`; không dùng history back hoặc root của app để thay landing.
- Desktop chia thông điệp/minh họa và form; form tối đa 480px, vùng input khoảng 400px. Màn ≤720px chuyển một cột, ẩn minh họa để ưu tiên nhập liệu.
- Dùng Nunito local 400/700, giấy `#FFF8ED`, surface `#FFFCF5`, chữ `#302132`, CTA `#793268`, viền control `#94818D`. CSS nằm trong `.paper-auth`, không đổi workspace/dashboard.
- Minh họa Paper bloom/gift/receipt lấy từ bộ asset đã có; ảnh trang trí có alt rỗng và không dùng dữ liệu tài khoản. Không cần thêm bộ ảnh sinh mới.
- Form có label, mật khẩu hiện/ẩn, hướng dẫn policy và status/error. Điều hướng đăng nhập/đăng ký là link route có `aria-current`, không giả là tab panel.
- Footer gọn có quyền riêng tư và email hỗ trợ. Không thêm nút ghi nhớ phiên hoặc social login chưa triển khai.
- Layout của verify-email/reset-password và toàn bộ workspace giữ nguyên trong phạm vi lần này.

### Workspace hiện có

Nguồn: `web/src/app/globals.css`, [workspace.css](web/src/app/workspace.css), [compact.css](web/src/app/compact.css). Web hiện giữ palette cream/peach/mauve, sans hệ thống và light workspace. Không thay runtime web trong những lượt chỉ sửa landing.

- Desktop có các đích tài chính chính; mobile cùng navigation và menu tài khoản. Admin giữ workspace/quản lý riêng. Bảng chuyển thành record cards trên màn nhỏ.
- Surface trắng khoảng 24px, input 12px, desktop control nền 40px và mobile 44px; input mobile chữ 16px để tránh zoom trình duyệt. Không ép token dp của native lên CSS web một cách máy móc.
- Form có label; thao tác hủy/xóa/toàn cục có xác nhận tương xứng. Chuyển expectedVersion, báo từng kết quả bulk, giữ request ID reconcile theo owner. Không silently overwrite.
- Quyền staff kiểm phía server và fail closed. User/admin không dùng chung entrypoint mutation nhạy cảm.
- Ảnh private có thời hạn ngắn. Backup dùng Web Crypto local với contract `.picket`; mật khẩu không gửi API. Native camera/Billing/alarm/biometric không được giả lập thành tính năng browser.
- Giữ skip link, keyboard focus, native select fallback, trạng thái status/error và reduced motion. Không giữ preview HTML/JSON riêng làm nguồn token cạnh tranh với source CSS.

## 8. Kiểm chứng và thay đổi thiết kế

Chạy checks phù hợp trước commit: mobile lint/typecheck/test; web build/lint/typecheck/test nếu thay web; landing test/build với APK đã xác minh. Kiểm light/dark, viewport hẹp, font 150%, tiền tệ/số dài, keyboard/Android back, gallery, dock và owner switching khi có thay đổi liên quan.

Phân biệt visual QA, unit/integration test, native emulator và điện thoại thật. Tài liệu không tự đóng các gate camera, sinh trắc, Play Billing, TalkBack hoặc pilot. Nghiên cứu/tham khảo không phải bằng chứng conversion hay độ chính xác tài chính.

Bất kỳ thay đổi nào về màu, font, spacing, navigation hoặc motion phải cập nhật **file này** và nguồn runtime tương ứng, không tạo thêm DESIGN.md. Xem bằng chứng tại [mobile Paper](docs/migration/MOBILE_PAPER_UNIFICATION_20261027.md), [landing motion](docs/migration/LANDING_MOTION_RESEARCH_20261027.md), [web UI acceptance](docs/migration/WEB_UI_ACCEPTANCE_20261022.md).


## 8. Hậu đài quản trị web

Nguồn thực thi: `web/src/features/admin/admin-platform.css`. Nunito tải local; nền kem, chữ mực, CTA tím mận. Sidebar desktop có cuộn riêng; màn hẹp có điều hướng chính và menu tài khoản để mở các module còn lại. Chỉ hiển thị module theo quyền server.

Tổng quan tối đa sáu KPI; bảng đọc được khi nguồn thiếu, có kỳ, search/filter và phân trang. Form chỉnh sửa dùng fieldset, lý do, xác nhận và trạng thái gửi. Những thao tác cần MFA có hướng dẫn mở trang bảo mật. Chart luôn kèm bảng dữ liệu. Không dùng ảnh tài khoản thật, số liệu giả hoặc màu làm dấu hiệu duy nhất.

Ba trang Auth chia hai cột trên desktop, một cột trên điện thoại; logo và “Về trang chủ” luôn trỏ landing. Verify/reset giữ bố cục hiện có, chỉ chuẩn hóa logic và thông báo.


### Bố cục admin được chỉnh theo góp ý 28/10

`admin-workspace-shell.tsx` là shell riêng, không dùng menu tài khoản chứa toàn bộ module. Sidebar 272px (252px ở laptop) gom Khách hàng / Tăng trưởng / Vận hành / Nội dung / Hệ thống; mỗi lần mở một nhóm, tên mục một dòng. Sidebar giữ cuộn bàn phím/con lăn khi màn thấp, ẩn thanh cuộn trang trí. ≤1050px chuyển sang nút Điều hướng có cùng nhóm; menu tài khoản rộng 238px chỉ còn MFA và đăng xuất.

Canvas `#FFF8ED`, sidebar `#F6EDDF`, panel `#F8F0E5`, filter `#F4EADF`, control `#FFF8ED`; card KPI dùng lilac `#E8DAEE`, peach `#FDE6D8`, mint `#DCEBD7`. Chữ/CTA dùng đúng token Paper; không dùng card trắng tinh. Button pill 42px, ô nhập/dropdown 42px, radius11px và viền `#BCA9B6`, focus tím mận. Font input màn hẹp16px. KPI bốn thẻ xếp4/2 cột, sáu thẻ3/2 cột; không để hàng lẻ tùy tiện. Form hai cột trên desktop và một cột trên màn hẹp, lý do/nội dung chiếm hàng đầy đủ.
