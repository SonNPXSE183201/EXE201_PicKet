import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="web-home">
      <a className="skip-link" href="#home-content">
        Đến nội dung chính
      </a>
      <nav className="nav shell" aria-label="Điều hướng chính">
        <Link className="brand" href="/" aria-label="Picket, trang chủ">
          <Image
            src="/picket-logo.png"
            alt=""
            width={48}
            height={48}
            priority
          />
          <span>Picket</span>
        </Link>
        <Link className="button secondary" href="/login">
          Đăng nhập
        </Link>
      </nav>
      <section
        className="hero shell"
        id="home-content"
        aria-labelledby="home-title"
      >
        <div className="hero-copy">
          <p className="eyebrow">Picket trên trình duyệt</p>
          <h1 id="home-title">
            Mang thu chi
            <br />
            về một chỗ.
          </h1>
          <p className="lead">
            Ghi một khoản chi, giữ một hóa đơn, xem lại kế hoạch của tháng. Tiếp
            tục với tài khoản Picket của bạn trên máy tính hoặc điện thoại.
          </p>
          <div className="actions">
            <Link className="button primary" href="/login">
              Mở Picket của bạn
            </Link>
            <Link className="button secondary" href="/register">
              Tạo tài khoản
            </Link>
          </div>
          <p className="home-note">
            Bản web cần kết nối mạng. Dữ liệu tài khoản dùng chung với ứng dụng
            Android.
          </p>
        </div>
        <aside
          className="home-preview"
          aria-label="Minh họa cách ghi thu chi, không phải dữ liệu tài khoản"
        >
          <div className="home-preview-heading">
            <Image src="/picket-logo.png" alt="" width={40} height={40} />
            <span>Mỗi khoản nhỏ đều được nhớ</span>
          </div>
          <p className="eyebrow">Ví dụ minh họa</p>
          <h2>Một ngày của bạn</h2>
          <dl className="home-ledger">
            <div>
              <dt>
                Cà phê sáng<small>Ăn uống</small>
              </dt>
              <dd className="expense">−35.000 ₫</dd>
            </div>
            <div>
              <dt>
                Đi chợ<small>Sinh hoạt</small>
              </dt>
              <dd className="expense">−260.000 ₫</dd>
            </div>
            <div>
              <dt>
                Khoản thu<small>Công việc</small>
              </dt>
              <dd className="income">+500.000 ₫</dd>
            </div>
          </dl>
          <p className="home-note">
            Ghi chép mỗi ngày, hiểu tiền của mình hơn.
          </p>
        </aside>
      </section>
      <section
        className="features shell"
        aria-label="Bạn có thể làm gì trên web"
      >
        <article>
          <h2>Ví nào, khoản đó</h2>
          <p>
            Ghi thu chi và chuyển tiền giữa các ví. Tìm lại giao dịch theo ngày,
            ví hoặc nội dung.
          </p>
        </article>
        <article>
          <h2>Giữ lại hóa đơn</h2>
          <p>
            Chọn ảnh hoặc chụp bằng điện thoại. Xem lại kết quả nhận diện trước
            khi lưu.
          </p>
        </article>
        <article>
          <h2>Có kế hoạch cho tháng</h2>
          <p>
            Xem ngân sách và thống kê chi tiêu. Theo dõi kỳ thanh toán cùng
            những khoản định kỳ.
          </p>
        </article>
      </section>
      <footer className="shell home-footer">
        <span>Picket</span>
        <Link href="/login">Đăng nhập để tiếp tục</Link>
      </footer>
    </main>
  );
}
