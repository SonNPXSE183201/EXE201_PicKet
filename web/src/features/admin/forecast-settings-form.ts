export type ForecastPlan = "free" | "plus" | "pro";
export const FORECAST_PLANS: readonly ForecastPlan[] = ["free", "plus", "pro"];

/** Database permission for the "Dự báo tài chính" settings card. */
export const FORECAST_PERMISSION = "forecast.manage";

export function canManageForecast(role: string | null, permissions?: readonly string[]) {
  return permissions ? permissions.includes(FORECAST_PERMISSION) : role === "owner";
}

export type ForecastSettingsBody = {
  enabled: boolean;
  minHistoryDays: number;
  lookbackMonths: number;
  scenarioPlans: ForecastPlan[];
  revision: number;
  reason: string;
};

/** Reads the admin form; throws with a short code when a field is out of range. */
export function parseForecastSettingsForm(form: { get(name: string): unknown; getAll(name: string): unknown[] }): ForecastSettingsBody {
  const minHistoryDays = Number(form.get("minHistoryDays"));
  if (!Number.isInteger(minHistoryDays) || minHistoryDays < 1 || minHistoryDays > 90) throw new Error("history");
  const lookbackMonths = Number(form.get("lookbackMonths"));
  if (!Number.isInteger(lookbackMonths) || lookbackMonths < 1 || lookbackMonths > 6) throw new Error("lookback");
  const scenarioPlans = [...new Set(form.getAll("scenarioPlans").map(String))];
  if (scenarioPlans.some((plan) => !FORECAST_PLANS.includes(plan as ForecastPlan))) throw new Error("plans");
  const revision = Number(form.get("revision"));
  if (!Number.isInteger(revision) || revision < 1) throw new Error("revision");
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 5 || reason.length > 500) throw new Error("reason");
  return { enabled: form.get("enabled") === "on", minHistoryDays, lookbackMonths, scenarioPlans: scenarioPlans as ForecastPlan[], revision, reason };
}

const PLAN_NAMES: Record<string, string> = { free: "Free", plus: "Plus", pro: "Pro" };

/** One-line summary of a settings snapshot for the change history. */
export function forecastSettingsSummary(value: Record<string, unknown>): string {
  const plans = Array.isArray(value.scenarioPlans) ? value.scenarioPlans.map((p) => PLAN_NAMES[String(p)] ?? String(p)) : [];
  return [
    `Dự báo: ${value.enabled === false ? "tắt" : "bật"}`,
    `Tối thiểu ${Number(value.minHistoryDays ?? 0)} ngày ghi chép`,
    `So sánh ${Number(value.lookbackMonths ?? 0)} tháng`,
    `Kịch bản: ${plans.length ? plans.join(", ") : "không gói nào"}`,
  ].join(" · ");
}
