import Link from "next/link";
import { Icon } from "@/core/ui/workspace-shell";

import { requireApiSession } from "@/core/auth/require-api-session";

import { updatePreferences, updateProfile } from "../actions";
import { FinancePageHeader, MutationError } from "../finance-ui";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

const personas = ["Đi làm", "Sinh viên", "Tự do", "Gia đình"];
const goals = ["Hiểu chi tiêu", "Tiết kiệm", "Quản lý hóa đơn"];

export default async function ProfilePage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const [{ profile }, entitlements] = await Promise.all([
    api.currentProfile(accessToken),
    api.currentEntitlements(accessToken),
  ]);
  const { error } = await searchParams;

  if (!profile)
    return (
      <FinancePageHeader
        title="Chưa có hồ sơ"
        description="Hãy hoàn thành onboarding trước khi thay đổi cài đặt."
      />
    );

  return (
    <>
      <FinancePageHeader
        title="Cá nhân"
        description="Tùy chỉnh Picket theo cách bạn quản lý tiền mỗi ngày."
      />
      <nav className="feature-hub" aria-label="Tiện ích cá nhân">
        {[
          ["/insights", "Thống kê thu chi", "chart"],
          ["/planning", "Lập kế hoạch tháng", "calendar"],
          ["/review-inbox", "Các mục cần kiểm tra", "receipt"],
          ["/receipts", "Hóa đơn của bạn", "receipt"],
          ["/keepsakes", "Đồ dùng & bảo hành", "shield"],
          ["/bills", "Kỳ thanh toán", "calendar"],
          ["/subscriptions", "Khoản định kỳ", "calendar"],
          ["/categories", "Quản lý danh mục", "grid"],
          ["/reconcile", "Đối soát số dư ví", "wallet"],
          ["/notifications", "Thông báo & nhắc việc", "calendar"],
          ["/billing", "Gói sử dụng", "shield"],
          ["/data", "Sao lưu & dữ liệu", "shield"],
          ["/help", "Quyền riêng tư & trợ giúp", "shield"],
        ].map(([href, label, icon]) => (
          <Link key={href} href={href}>
            <Icon name={icon} />
            {label}
          </Link>
        ))}
      </nav>
      <MutationError visible={Boolean(error)} />
      <section className="settings-grid">
        <article className="finance-panel settings-panel">
          <h2>Thông tin cá nhân</h2>
          <form action={updateProfile} className="finance-form">
            <label>
              Tên hiển thị
              <input
                defaultValue={profile.displayName}
                maxLength={120}
                name="displayName"
                required
              />
            </label>
            <label>
              Ngôn ngữ
              <select defaultValue={profile.locale} name="locale">
                <option value="vi-VN">Tiếng Việt</option>
                <option value="en-US">English</option>
              </select>
            </label>
            <label>
              Múi giờ
              <select defaultValue={profile.timezone} name="timezone">
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
                <option value="UTC">UTC</option>
              </select>
            </label>
            <button className="button primary" type="submit">
              Lưu hồ sơ
            </button>
          </form>
        </article>
        <article className="finance-panel settings-panel">
          <h2>Trải nghiệm tài chính</h2>
          <form action={updatePreferences} className="finance-form">
            <label>
              Nhịp sống
              <select defaultValue={profile.persona} name="persona">
                {personas.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Mục tiêu
              <select defaultValue={profile.goal} name="goal">
                {goals.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              Tiền tệ chính
              <select defaultValue={profile.currencyCode} name="currencyCode">
                <option>VND</option>
                <option>USD</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                defaultChecked={profile.hideBalance}
                name="hideBalance"
                type="checkbox"
              />
              Ẩn số tiền trên tổng quan
            </label>
            <button className="button primary" type="submit">
              Lưu tùy chọn
            </button>
          </form>
        </article>
        <article
          className="finance-panel settings-panel entitlement-panel"
          aria-labelledby="plan-heading"
        >
          <p className="eyebrow">Gói sử dụng</p>
          <h2 id="plan-heading">{entitlements.tier.toUpperCase()}</h2>
          <p>
            OCR cloud còn{" "}
            <strong>
              {entitlements.ocrFallbackRemaining}/
              {entitlements.ocrFallbackDailyLimit}
            </strong>{" "}
            lượt trong 24 giờ.
          </p>
          <p className="entitlement-note">
            Lượt sử dụng được tính và xác thực tại máy chủ.
          </p>
        </article>
      </section>
      <div className="profile-data-link">
        <Link className="button secondary" href="/data">
          Export và quản lý dữ liệu
        </Link>
      </div>
    </>
  );
}
