import { requireApiSession } from "@/core/auth/require-api-session";
import { FinancePageHeader } from "../finance-ui";
export default async function BillingPage() {
  const { api, accessToken } = await requireApiSession();
  const entitlements = await api.currentEntitlements(accessToken);
  return (
    <>
      <FinancePageHeader
        title="Gói của bạn"
        description="Quyền lợi được dùng chung với tài khoản Picket trên Android."
      />
      <article className="data-panel">
        <h2>Gói hiện tại: {entitlements.tier.toUpperCase()}</h2>
        <p>
          OCR cloud còn{" "}
          <strong>
            {entitlements.ocrFallbackRemaining}/
            {entitlements.ocrFallbackDailyLimit}
          </strong>{" "}
          lượt trong cửa sổ 24 giờ. Đã dùng {entitlements.ocrFallbackUsed} lượt.
        </p>
        <p>
          Để mua hoặc quản lý thuê bao Google Play, mở phần Gói dịch vụ trong
          ứng dụng Android hoặc tài khoản Google Play đã mua gói.
        </p>
        <p>Web không tự tạo giao dịch thanh toán thay cho Google Play.</p>
        <a
          className="button secondary"
          href="https://play.google.com/store/account/subscriptions"
          target="_blank"
          rel="noopener noreferrer"
        >
          Quản lý thuê bao Google Play
        </a>
      </article>
    </>
  );
}
