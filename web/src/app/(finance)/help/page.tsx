import Link from "next/link";
import { FinancePageHeader } from "../finance-ui";
export default function HelpPage() {
  return (
    <>
      <FinancePageHeader
        title="Quyền riêng tư & trợ giúp"
        description="Chọn cách sử dụng phù hợp với thiết bị của bạn."
      />
      <section className="finance-stack">
        <article className="finance-panel">
          <h2>Dữ liệu trên web</h2>
          <p>
            Web dùng tài khoản để lưu và đồng bộ dữ liệu. Chỉ đăng nhập trên
            thiết bị bạn tin cậy và đăng xuất khi dùng máy chung. Không chia sẻ
            mật khẩu hoặc đường dẫn đặt lại mật khẩu.
          </p>
          <Link className="button secondary" href="/data">
            Sao lưu và quản lý dữ liệu
          </Link>
        </article>
        <article className="finance-panel">
          <h2>Camera và ảnh hóa đơn</h2>
          <p>
            Trình duyệt chỉ mở camera hoặc tệp ảnh khi bạn chủ động chọn. Ảnh
            gửi lên cloud cần được bạn đồng ý; hãy che thông tin không cần thiết
            trên hóa đơn trước khi tải lên.
          </p>
        </article>
        <article className="finance-panel">
          <h2>Những tính năng dành riêng cho Android</h2>
          <p>
            Nhận diện hóa đơn trực tiếp bằng ML Kit, nhắc việc nền của hệ điều
            hành, khóa sinh trắc học và cập nhật APK thuộc ứng dụng Android.
            Trên web, bạn dùng nhắc việc trong ứng dụng, OCR cloud có sự đồng ý
            và phiên đăng nhập của trình duyệt. Không cần cấp quyền cài APK cho
            trình duyệt.
          </p>
          <Link href="/notifications">Xem nhắc việc</Link>
        </article>
        <article className="finance-panel">
          <h2>Khi kết nối không ổn định</h2>
          <p>
            Không tải lại trang khi đang lưu một thay đổi quan trọng. Nếu báo
            xung đột, hãy mở lại bản mới nhất trước khi sửa để không ghi đè dữ
            liệu từ thiết bị khác. Bạn có thể dùng ứng dụng Android ở chế độ
            riêng trên thiết bị khi cần ghi chép không có mạng.
          </p>
        </article>
      </section>
    </>
  );
}
