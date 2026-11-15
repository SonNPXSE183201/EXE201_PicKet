import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { AdminIcon } from "@/features/admin/ui/admin-icon";
import "../paper-auth.css";

/* Left purple panel: the original Picket story (two receipt tickets + money bloom).
   The tickets are illustrations (aria-hidden), not live figures. The right side
   (forms) follows Figma › Web per screen. */
const stories = {
  user: {
    title: "Tiền có chỗ.\nBạn có khoảng thở.",
    copy: "Ghi chép chi tiêu, quét hoá đơn và lên kế hoạch tháng — đồng bộ giữa điện thoại và máy tính.",
    subtitle: undefined,
    cards: [
      { icon: "calendar", label: "Hôm nay · 3/11", value: "+12.000.000 ₫", note: "Thu nhập" },
      { icon: "wallet", label: "Ví hằng ngày", value: "8.415.000 ₫", note: "Số dư hiện có" },
    ],
  },
  admin: {
    title: "Sổ tay vận hành\ncủa Picket",
    copy: "Theo dõi người dùng, hoá đơn, sự cố và nội dung — tất cả trên những trang giấy gọn gàng.",
    subtitle: "Không gian quản trị",
    cards: [
      { icon: "mail", label: "Yêu cầu đang mở", value: "18", note: "3 khẩn cấp" },
      { icon: "users", label: "Người dùng", value: "12.480", note: "+842 trong 30 ngày" },
    ],
  },
} as const;

/** Screens that use the shell; every user screen shares the same left panel. */
export type AuthStory = "login" | "register" | "phone" | "forgot" | "verify" | "admin";

export function PaperAuthShell({
  story: storyKey = "login",
  fixedViewport = false,
  footer = false,
  children,
}: {
  story?: AuthStory;
  fixedViewport?: boolean;
  /** Copyright + links row (Figma shows it on the sign-in screen). */
  footer?: boolean;
  children: ReactNode;
}) {
  const story = stories[storyKey === "admin" ? "admin" : "user"];
  return (
    <div className={`pa-root${fixedViewport ? " is-fixed" : ""}${footer ? " has-footer" : ""}`}>
      <a className="pa-skip" href="#auth-content">Đến biểu mẫu</a>
      <aside className="pa-pouch">
        <Link className="pa-brand" href={storyKey === "admin" ? "/login?next=/admin" : "/"} aria-label="Picket, trang chủ">
          <span className="pa-coin"><Image src="/picket-logo-192.png" alt="" width={40} height={40} priority /></span>
          <span><strong>Picket</strong>{story.subtitle && <small>{story.subtitle}</small>}</span>
        </Link>
        <div className="pa-story">
          <p className="pa-story-h">{story.title}</p>
          <p className="pa-story-p">{story.copy}</p>
        </div>
        <div className="pa-cards" aria-hidden="true">
          {story.cards.map((card, i) => (
            <div key={card.label} className={`pa-ticket ${i === 0 ? "is-a" : "is-b"}`}>
              <div className="pa-ticket-paper">
                <div className="pa-ticket-head"><span><AdminIcon name={card.icon} size={18} /></span><span>{card.label}</span></div>
                <b>{card.value}</b>
                <small>{card.note}</small>
              </div>
            </div>
          ))}
        </div>
        <img className="pa-art" src="/admin-paper/money-bloom-scene-v1.webp" alt="" width={190} height={160} />
      </aside>
      <main className="pa-main" id="auth-content">
        <div className="pa-form-wrap">{children}</div>
      </main>
      {footer && (
        <footer className="pa-footer">
          <span>© {new Date().getFullYear()} Picket, chăm chút từng khoản nhỏ.</span>
          <nav aria-label="Thông tin và hỗ trợ">
            <a href="https://picketfinance.com/privacy.html">Quyền riêng tư</a>
            <a href="mailto:picketfinance@gmail.com">Liên hệ hỗ trợ</a>
          </nav>
        </footer>
      )}
    </div>
  );
}
