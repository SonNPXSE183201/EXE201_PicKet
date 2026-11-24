import { redirect } from "next/navigation";
import { forecastAccess } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { ForecastDetail } from "@/features/forecast/forecast-detail";
import { ForecastAccessScreen } from "@/features/forecast/forecast-access-screen";
import { loadForecast } from "@/features/forecast/load-forecast";
import { ForecastError } from "@/features/forecast/forecast-error";
import { BalancePrivacyProvider, BalanceVisibilityToggle } from "../balance-privacy";

export const metadata = { title: "Dự báo cuối tháng" };
export default async function ForecastPage() {
  const { api, accessToken } = await requireApiSession();
  const [{ profile }, accounts, entitlements] = await Promise.all([api.currentProfile(accessToken), api.listAccounts(accessToken).then(value => value.accounts).catch(() => null), api.currentEntitlements(accessToken).catch(() => null)]);
  if (!profile?.onboardingCompleted) redirect("/onboarding");
  const { settings, forecast, currency, settingsError } = await loadForecast(api, accessToken, profile, accounts);
  const access = forecastAccess(settings);
  return <BalancePrivacyProvider initialHidden={profile.hideBalance}><div className="fc-page">
    <header className="fc-page-head"><div><h1>Dự báo cuối tháng</h1><p className="fc-muted">{access === "locked" ? "Tính năng của gói Plus và Pro" : "Ước tính từ ghi chép của bạn"}{access === "full" && entitlements && <span className="fc-desktop-plan"> · gói {entitlements.tier === "pro" ? "Pro" : entitlements.tier === "plus" ? "Plus" : "Free"}</span>}</p></div>{access === "full" && <BalanceVisibilityToggle />}</header>
    {settingsError ? <ForecastError /> : access === "hidden" ? <p className="fc-card fc-muted" role="status">Dự báo tài chính đang tạm tắt.</p> : access === "signIn" || access === "locked" ? <ForecastAccessScreen signedOut={access === "signIn"} /> : !forecast ? <ForecastError /> : <ForecastDetail forecast={forecast} scenarioAllowed={settings.scenario} currency={currency} />}
  </div></BalancePrivacyProvider>;
}
