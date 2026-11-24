import type { PicketApiClient } from "@picket/api-client";
import { defaultForecastSettings, forecastAccess, forecastMonthEnd, parseForecastSettings, type ForecastSettings, type MonthForecast } from "@picket/domain";

import { loadAllTransactions } from "@/core/finance/load-transactions";

export type WebForecast = { settings: ForecastSettings; forecast: MonthForecast | null; currency: string; settingsError?: boolean };

/** Settings from the API (defaults when it cannot be reached), then the forecast from the user's own records. */
export async function loadForecast(
  api: PicketApiClient,
  token: string,
  profile: { currencyCode: string; timezone?: string | null },
  accounts: Parameters<typeof forecastMonthEnd>[0]["accounts"] | null,
  /** Already-loaded records (the dashboard has them); fetched here when omitted. */
  loaded?: Parameters<typeof forecastMonthEnd>[0]["transactions"],
): Promise<WebForecast> {
  const settings = await api.forecastSettings(token).then(value => parseForecastSettings(value, !!token)).catch(() => null);
  const currency = profile.currencyCode || "VND";
  if (!settings) return { settings: defaultForecastSettings, forecast: null, currency, settingsError: true };
  if (forecastAccess(settings) !== "full") return { settings, forecast: null, currency };
  if (!accounts) return { settings, forecast: null, currency };
  try {
    const transactions = loaded ?? await loadAllTransactions(api, token);
    const forecast = forecastMonthEnd({
      accounts,
      transactions,
      currency,
      timeZone: profile.timezone || "Asia/Ho_Chi_Minh",
      now: new Date(),
      lookbackMonths: settings.lookbackMonths,
      minHistoryDays: settings.minHistoryDays,
    });
    return { settings, forecast, currency };
  } catch {
    return { settings, forecast: null, currency };
  }
}
