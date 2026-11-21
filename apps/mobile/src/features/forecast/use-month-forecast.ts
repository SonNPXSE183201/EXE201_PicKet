import { useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { useAccounts } from "@/features/accounts/accounts-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { useForecastSettings } from "./forecast-settings";
import { forecastMonthEnd, type MonthForecast } from "./month-forecast";

import { forecastCurrencies } from "./forecast-currencies";

export function useMonthForecast(options: { currency?: string; purchase?: number } = {}) {
  const settings = useForecastSettings();
  const { accounts, loading: accountsLoading } = useAccounts();
  const { transactions, loading } = useTransactions();
  const { profile } = useProfile();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const listener = AppState.addEventListener("change", state => { if (state === "active") setNow(new Date()); });
    return () => listener.remove();
  }, []);
  const currencies = forecastCurrencies(accounts, profile?.currencyCode ?? "VND");
  const currency = options.currency && currencies.includes(options.currency) ? options.currency : currencies[0] ?? "VND";
  const timeZone = profile?.timezone ?? "Asia/Ho_Chi_Minh";
  const purchase = settings.scenario ? options.purchase : undefined;
  const run = (amount?: number): MonthForecast | null => {
    if (!settings.enabled) return null;
    try {
      return forecastMonthEnd({ accounts, transactions, currency, timeZone, now, lookbackMonths: settings.lookbackMonths, minHistoryDays: settings.minHistoryDays, purchase: amount });
    } catch {
      return null;
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const forecast = useMemo(() => run(), [accounts, transactions, currency, timeZone, now, settings.enabled, settings.lookbackMonths, settings.minHistoryDays]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scenario = useMemo(() => (purchase ? run(purchase) : null), [forecast, purchase]);
  const initialLoading = (loading || accountsLoading) && accounts.length === 0 && transactions.length === 0;
  return { settings, forecast, scenario, currency, currencies, initialLoading, hidden: profile?.hideBalance ?? false };
}
