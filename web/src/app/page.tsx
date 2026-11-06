import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { LandingSimulator } from "./landing-simulator";
import "./landing-paper.css";

export const metadata: Metadata = {
  title: "Picket — Quản lý tài chính cá nhân 3D Paper Art",
  description:
    "Ghi chép thu chi, quét hóa đơn và chia ngân sách trong không gian Paper Art của Picket.",
};

const features = [
  {
    id: "ocr",
    image: "/paper/receipt-envelope-v1.png",
    imageAlt: "Phong bì hóa đơn Picket",
    title: "Quét hóa đơn AI OCR",
    description:
      "Lưu hóa đơn và nhận diện thông tin chính để bạn xem lại, chỉnh sửa trước khi ghi vào sổ thu chi.",
    tint: "peach",
  },
  {
    id: "budget",
    image: "/paper/pocket-food-v2.png",
    imageAlt: "Phong bì ngân sách giấy",
    title: "Phong bì ngân sách 3D",
    description:
      "Chia khoản chi theo từng mục tiêu và theo dõi phần ngân sách còn lại bằng hình ảnh gần gũi.",
    tint: "mint",
  },
  {
    id: "security",
    image: "/paper/category-security-v1.png",
    imageAlt: "Biểu tượng bảo mật",
    title: "Quyền riêng tư của bạn",
    description:
      "Tài khoản được bảo vệ bằng các cơ chế xác thực và bảo mật. Bạn có thể xem chi tiết trong chính sách quyền riêng tư.",
    tint: "lilac",
  },
] as const;

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <Link
      className={footer ? "legacy-footer-brand" : "legacy-brand"}
      href="/"
      aria-label="Picket, trang chủ"
    >
      <Image
        src="/picket-logo.png"
        alt=""
        width={footer ? 44 : 46}
        height={footer ? 44 : 46}
        priority={!footer}
      />
      <span>Picket</span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="legacy-landing">
      <a className="skip-link" href="#landing-content">
        Đến nội dung chính
      </a>

      <header className="legacy-header">
        <Brand />
        <nav className="legacy-nav" aria-label="Điều hướng chính">
          <a className="is-active" href="#top">
            Trang chủ
          </a>
          <a href="#features">Tính năng 3D</a>
          <a href="#ocr">Công nghệ AI OCR</a>
          <a href="#security">Bảo mật</a>
          <a href="#simulator">Trải nghiệm tương tác</a>
        </nav>
        <div className="legacy-header-actions">
          <Link className="legacy-button legacy-button-secondary" href="/login">
            Đăng nhập
          </Link>
          <Link className="legacy-button legacy-button-primary" href="/register">
            Tạo tài khoản
          </Link>
        </div>
      </header>

      <div id="top" />
      <section
        className="legacy-hero"
        id="landing-content"
        aria-labelledby="landing-title"
      >
        <div className="legacy-hero-copy">
          <div className="legacy-hero-badge">
            <span aria-hidden="true" />
            Tài chính cá nhân theo phong cách 3D Paper Art
          </div>
          <h1 id="landing-title">
            Tiền có chỗ.
            <br />
            Bạn có <span>khoảng thở</span>.
          </h1>
          <p className="legacy-hero-description">
            Ứng dụng tài chính cá nhân tinh tế theo phong cách giấy thủ công.
            Ghi chép thu chi, quét hóa đơn và phân chia ngân sách trong một
            không gian dễ nhìn, dễ dùng.
          </p>
          <div className="legacy-hero-actions">
            <Link className="legacy-button legacy-button-primary" href="/login">
              Trải nghiệm Picket Web
            </Link>
            <a
              className="legacy-button legacy-button-secondary"
              href="https://play.google.com/store/apps/details?id=com.picket.mobile"
              target="_blank"
              rel="noreferrer"
            >
              Tải ứng dụng Android
            </a>
          </div>
          <ul className="legacy-trust-list" aria-label="Điểm nổi bật">
            <li>Mã hóa dữ liệu trên thiết bị</li>
            <li>Không quảng cáo gây gián đoạn</li>
            <li>Đồng bộ web và Android</li>
          </ul>
        </div>

        <div className="legacy-hero-stage" role="img" aria-label="Minh họa Picket">
          <div className="legacy-stage-glow" />
          <article className="legacy-stage-card">
            <div className="legacy-stage-card-top">
              <span>TỔNG QUAN TÀI CHÍNH</span>
              <span className="legacy-status-pill">Đang theo dõi</span>
            </div>
            <p className="legacy-stage-balance">48.250.000 ₫</p>
            <div className="legacy-stage-art">
              <Image
                src="/auth-paper/paper-bloom.webp"
                alt="Minh họa những khoản tiền được chăm chút"
                width={340}
                height={300}
                priority
              />
            </div>
            <div className="legacy-stage-wallet-row">
              <span>3 ví đang hoạt động</span>
              <span>Quản lý ví&nbsp; ↗</span>
            </div>
          </article>
          <div className="legacy-float-card legacy-float-card-one">
            <Image src="/paper/category-cafe-v1.png" alt="" width={38} height={38} />
            <span>
              <strong>Cà phê sáng</strong>
              <small>−65.000 ₫ · Vừa xong</small>
            </span>
          </div>
          <div className="legacy-float-card legacy-float-card-two">
            <Image src="/paper/category-bonus-v1.png" alt="" width={38} height={38} />
            <span>
              <strong>Thưởng hiệu suất</strong>
              <small>+5.000.000 ₫ · Ví chính</small>
            </span>
          </div>
        </div>
      </section>

      <LandingSimulator />

      <section
        className="legacy-features"
        id="features"
        aria-label="Tính năng Picket"
      >
        <div className="legacy-section-heading">
          <span className="legacy-kicker">MỌI THỨ Ở ĐÚNG CHỖ</span>
          <h2>Những khoản nhỏ, một bức tranh rõ ràng</h2>
          <p>
            Từ hóa đơn trong túi đến kế hoạch cho tháng sau, Picket giúp bạn
            nhìn lại dòng tiền theo cách trực quan hơn.
          </p>
        </div>
        <div className="legacy-feature-grid">
          {features.map((feature) => (
            <article
              className={`legacy-feature-card legacy-feature-${feature.tint}`}
              id={feature.id}
              key={feature.id}
            >
              <div className="legacy-feature-art">
                <Image
                  src={feature.image}
                  alt={feature.imageAlt}
                  width={112}
                  height={112}
                />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              {feature.id === "ocr" && (
                <a href="#simulator">Khám phá cách Picket hoạt động ↗</a>
              )}
              {feature.id === "security" && (
                <a href="https://picketfinance.com/privacy.html">
                  Xem chính sách quyền riêng tư ↗
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="legacy-footer" id="download">
        <div className="legacy-footer-grid">
          <section className="legacy-footer-about" aria-label="Về Picket">
            <Brand footer />
            <p>
              Ghi thu chi, giữ hóa đơn và chăm chút cho những dự định. Bắt đầu
              từ các khoản nhỏ mỗi ngày cùng Picket.
            </p>
            <div className="legacy-footer-contact">
              <a href="mailto:picketfinance@gmail.com">picketfinance@gmail.com</a>
              <a href="tel:+84369076214">0369 076 214</a>
            </div>
          </section>
          <nav className="legacy-footer-column" aria-label="Sản phẩm">
            <h2>Sản phẩm</h2>
            <a href="#features">Tính năng Picket</a>
            <a href="#simulator">Mô phỏng ngân sách</a>
            <Link href="/login">Đăng nhập</Link>
            <Link href="/register">Tạo tài khoản</Link>
            <a href="https://play.google.com/store/apps/details?id=com.picket.mobile">
              Tải ứng dụng Android
            </a>
          </nav>
          <nav className="legacy-footer-column" aria-label="Hướng dẫn và chính sách">
            <h2>Hướng dẫn &amp; chính sách</h2>
            <a href="#ocr">Công nghệ AI OCR</a>
            <a href="#security">Bảo mật và quyền riêng tư</a>
            <a href="https://picketfinance.com/privacy.html">Quyền riêng tư</a>
            <a href="https://picketfinance.com/account-deletion.html">
              Xóa tài khoản
            </a>
          </nav>
          <nav className="legacy-footer-column" aria-label="Kết nối với Picket">
            <h2>Kết nối với Picket</h2>
            <p>Theo dõi hướng dẫn và tính năng mới nhất từ Picket.</p>
            <a href="https://www.facebook.com/profile.php?id=61594108596611">
              Facebook Picket ↗
            </a>
            <a href="https://www.youtube.com/@PicKetFinance26">
              YouTube PicKetFinance26 ↗
            </a>
          </nav>
        </div>
        <div className="legacy-footer-bottom">
          <span>© {new Date().getFullYear()} Picket. Ghi chép mỗi ngày, hiểu tiền của mình hơn.</span>
          <a href="#top">Về đầu trang ↑</a>
        </div>
      </footer>
    </main>
  );
}
