import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { useAccounts } from "@/features/accounts/accounts-context";
import { useProfile } from "@/features/profile/profile-context";
import { useTransactions } from "@/features/transactions/transactions-context";
import { useForecastSettings } from "./forecast-settings";
import { forecastAccess, forecastMonthEnd, type MonthForecast } from "@picket/domain";

import { forecastCurrencies } from "./forecast-currencies";

export function useMonthForecast(options: { currency?: string; purchase?: number } = {}) {
  const { settings, loading: settingsLoading, error: settingsError, refetch } = useForecastSettings();
  const access = forecastAccess(settings);
  const { accounts, loading: accountsLoading, error: accountsError, refresh: refreshAccounts } = useAccounts();
  const { transactions, loading, error: transactionsError, refresh: refreshTransactions } = useTransactions();
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
  const run = useCallback((amount?: number): MonthForecast | null => {
    if (access !== "full" || accountsError || transactionsError || loading || accountsLoading) return null;
    try {
      return forecastMonthEnd({ accounts, transactions, currency, timeZone, now, lookbackMonths: settings.lookbackMonths, minHistoryDays: settings.minHistoryDays, purchase: amount });
    } catch {
      return null;
    }
  }, [access, accountsError, transactionsError, loading, accountsLoading, accounts, transactions, currency, timeZone, now, settings.lookbackMonths, settings.minHistoryDays]);
  const forecast = useMemo(() => run(), [run]);
  const scenario = useMemo(() => (forecast && purchase ? run(purchase) : null), [forecast, purchase, run]);
  const initialLoading = settingsLoading || (access === "full" && (loading || accountsLoading));
  const retry = async () => {
    refetch();
    await Promise.allSettled([refreshAccounts(), refreshTransactions()]);
    setNow(new Date());
  };
  return { settings, access, forecast, scenario, currency, currencies, initialLoading, settingsError, retry, hidden: profile?.hideBalance ?? false };
}
