import { redirect } from "next/navigation";

import { requireApiSession } from "@/core/auth/require-api-session";
import { ForecastDetail } from "@/features/forecast/forecast-detail";
import { loadForecast } from "@/features/forecast/load-forecast";
import { BalancePrivacyProvider, BalanceVisibilityToggle } from "../balance-privacy";

export const metadata = { title: "Dự báo cuối tháng" };

export default async function ForecastPage() {
  const { api, accessToken } = await requireApiSession();
  const [{ profile }, { accounts }] = await Promise.all([api.currentProfile(accessToken), api.listAccounts(accessToken)]);
  if (!profile?.onboardingCompleted) redirect("/onboarding");
  const { settings, forecast, currency } = await loadForecast(api, accessToken, profile, accounts);
  return (
    <BalancePrivacyProvider initialHidden={profile.hideBalance}>
      <header className="fc-page-head">
        <div>
          <p className="fc-eyebrow">Dự báo</p>
          <h1 className="finance-title">Số dư cuối tháng</h1>
        </div>
        <BalanceVisibilityToggle />
      </header>
      {!settings.enabled ? (
        <p className="fc-card fc-muted" role="status">Dự báo tài chính đang tạm tắt.</p>
      ) : !forecast ? (
        <p className="fc-card fc-muted" role="alert">Chưa tính được dự báo. Hãy kiểm tra lại dữ liệu ví và giao dịch.</p>
      ) : (
        <ForecastDetail forecast={forecast} scenarioAllowed={settings.scenario} currency={currency} />
      )}
      <p className="fc-note">Dự báo dựa trên lịch sử chi tiêu của bạn, chỉ mang tính tham khảo và không phải lời khuyên tài chính.</p>
    </BalancePrivacyProvider>
  );
}
