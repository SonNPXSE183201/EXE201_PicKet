import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link className="brand auth-brand" href="/">
          <Image src="/picket-logo.png" alt="" width={48} height={48} />
          <span>Picket</span>
        </Link>
        <p className="eyebrow">Không tìm thấy trang</p>
        <h1 className="auth-title">Nội dung không còn ở đây</h1>
        <p className="auth-copy">
          Đường dẫn có thể đã thay đổi hoặc bản ghi đã được xóa. Hãy quay lại
          không gian của bạn để kiểm tra dữ liệu mới nhất.
        </p>
        <Link className="button primary" href="/session">
          Về không gian của bạn
        </Link>
        <Link className="back-link" href="/">
          Về trang chủ
        </Link>
      </section>
    </main>
  );
}
