import Link from "next/link";
import type { ReactNode } from "react";
import { AdminIcon } from "@/features/admin/ui/admin-icon";
import "../paper-auth.css";

type Story = {
  eyebrow?: string;
  title: string;
  copy: string;
  subtitle?: string;
  /** Feature tiles under the copy (Figma › Web › 01 Đăng nhập). */
  tiles?: readonly { icon: string; title: string; note: string }[];
  art: { src: string; width: number; height: number };
};

const bloom = { src: "/admin-paper/money-bloom-scene-v1.webp", width: 180, height: 120 };
const receipt = { src: "/admin-paper/receipt-v2.webp", width: 128, height: 128 };

/* Figma › Web (1440×900): purple story panel per screen. Illustrations are decorative. */
export const authStories = {
  login: {
    eyebrow: "Tiền có chỗ · Cho bạn",
    title: "Tiền có chỗ.\nBạn có khoảng thở.",
    copy: "Ghi chép chi tiêu, quét hoá đơn và lên kế hoạch tháng — đồng bộ an toàn trên mọi thiết bị.",
    tiles: [
      { icon: "lock", title: "Riêng tư theo thiết kế", note: "Dữ liệu của riêng bạn" },
      { icon: "receipt", title: "Hoá đơn trong một chỗ", note: "Lưu và tìm lại dễ dàng" },
    ],
    art: bloom,
  },
  register: {
    title: "Tiền có chỗ.\nBạn có khoảng thở.",
    copy: "Tạo tài khoản để bắt đầu ghi chép, quét hoá đơn và đồng bộ dữ liệu.",
    art: bloom,
  },
  phone: {
    title: "Mọi khoản thu chi,\nở đúng một nơi.",
    copy: "Tạo tài khoản bằng số điện thoại; mã xác minh được gửi qua SMS.",
    art: bloom,
  },
  forgot: {
    title: "Lấy lại quyền\ntruy cập.",
    copy: "Chúng tôi sẽ gửi hướng dẫn an toàn đến email đã đăng ký.",
    art: { src: "/admin-paper/plan-simple-v2.webp", width: 120, height: 120 },
  },
  verify: {
    title: "Một bước nữa\nlà bắt đầu.",
    copy: "Mã xác minh giúp bảo vệ tài khoản và đồng bộ dữ liệu an toàn.",
    art: receipt,
  },
  admin: {
    title: "Sổ tay vận hành\ncủa Picket",
    copy: "Theo dõi người dùng, hoá đơn, sự cố và nội dung — tất cả trên những trang giấy gọn gàng.",
    subtitle: "Không gian quản trị",
    art: bloom,
  },
} satisfies Record<string, Story>;

export type AuthStory = keyof typeof authStories;

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
  const story: Story = authStories[storyKey];
  return (
    <div className={`pa-root${fixedViewport ? " is-fixed" : ""}${footer ? " has-footer" : ""}`}>
      <a className="pa-skip" href="#auth-content">Đến biểu mẫu</a>
      <aside className="pa-pouch">
        <Link className="pa-brand" href={storyKey === "admin" ? "/login?next=/admin" : "/"} aria-label="Picket, trang chủ">
          <span className="pa-coin"><AdminIcon name="camera" size={24} /></span>
          <span><strong>Picket</strong>{story.subtitle && <small>{story.subtitle}</small>}</span>
        </Link>
        <div className={`pa-story${story.eyebrow ? "" : " no-eyebrow"}`}>
          {story.eyebrow && <p className="pa-story-eyebrow">{story.eyebrow}</p>}
          <p className="pa-story-title">{story.title}</p>
          <p className="pa-story-copy">{story.copy}</p>
          {story.tiles && (
            <ul className="pa-tiles">
              {story.tiles.map((tile) => (
                <li key={tile.title}>
                  <AdminIcon name={tile.icon} size={22} />
                  <span><b>{tile.title}</b><small>{tile.note}</small></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <img className="pa-art" src={story.art.src} alt="" width={story.art.width} height={story.art.height} />
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
