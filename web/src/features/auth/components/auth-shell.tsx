import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import "../auth-paper.css";

const stories = {
  login: {
    title: "Tiền có chỗ.\nBạn có khoảng thở.",
    copy: "Trải nghiệm quản lý tài chính an tâm, thông minh và tinh tế cùng Picket.",
    image: "bloom",
    imageAlt: "Minh họa Paper Art về những khoản tiền được chăm chút",
    benefits: ["Mã hóa dữ liệu", "Nhận diện hóa đơn AI OCR"],
  },
  register: {
    title: "Bắt đầu với Picket",
    copy: "Tạo tài khoản miễn phí để ghi chép, quản lý phong bì ngân sách và chăm chút kế hoạch tài chính của riêng bạn.",
    image: "gift",
    imageAlt: "Món quà giấy Paper Art",
    benefits: ["Miễn phí bắt đầu", "Riêng tư", "Dễ dàng theo dõi"],
  },
  recovery: {
    title: "Một chút trợ giúp.\nĐể bạn tiếp tục.",
    copy: "Quên mật khẩu cũng không sao. Nhận hướng dẫn qua email để trở lại với tài khoản Picket của bạn.",
    image: "receipt",
    imageAlt: "Hóa đơn giấy Paper Art",
    benefits: ["Hướng dẫn qua email", "Tài khoản Picket của bạn"],
  },
} as const;

export function AuthShell({
  variant,
  children,
}: {
  variant: keyof typeof stories;
  children: ReactNode;
}) {
  const story = stories[variant];

  return (
    <div className={`paper-auth legacy-auth legacy-auth-${variant}`}>
      <a className="skip-link" href="#auth-content">
        Đến biểu mẫu
      </a>
      <div className="legacy-auth-layout">
        <aside className="legacy-auth-story">
          <div className="legacy-auth-story-top">
            <Link className="legacy-auth-brand" href="/" aria-label="Picket, trang chủ">
              <Image src="/picket-logo.png" alt="" width={52} height={52} priority />
              <span>
                <strong>Picket</strong>
                <small>Tài chính 3D Paper Art</small>
              </span>
            </Link>
            <Link className="legacy-auth-home" href="/">
              <span aria-hidden="true">←</span> Về trang chủ
            </Link>
          </div>
          <div className="legacy-auth-story-content">
            <Image
              className="legacy-auth-illustration"
              src={`/auth-paper/paper-${story.image}.webp`}
              alt={story.imageAlt}
              width={300}
              height={300}
              priority
            />
            <h1>{story.title}</h1>
            <p>{story.copy}</p>
          </div>
          <ul className="legacy-auth-benefits" aria-label="Điểm nổi bật">
            {story.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </aside>

        <main className="legacy-auth-form-side" id="auth-content">
          <div className="legacy-auth-form-card">{children}</div>
        </main>
      </div>
      <footer className="paper-auth-footer legacy-auth-footer">
        <p>© {new Date().getFullYear()} Picket. Chăm chút từng khoản nhỏ.</p>
        <nav aria-label="Thông tin và hỗ trợ">
          <a href="https://picketfinance.com/privacy.html">Quyền riêng tư</a>
          <a href="mailto:picketfinance@gmail.com">Liên hệ hỗ trợ</a>
        </nav>
      </footer>
    </div>
  );
}
