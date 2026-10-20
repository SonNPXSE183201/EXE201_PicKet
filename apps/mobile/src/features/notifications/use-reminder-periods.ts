import type { Budget } from "@picket/domain";
import { useEffect, useMemo, useState } from "react";
import { picketApi } from "@/core/api/client";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { useAuth } from "@/features/auth/auth-context";

/** Do not issue a default-limit warning before authoritative carry/transfer loads. */
export function useReminderPeriods(budgets: Budget[], month: string) {
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const owner = session?.user.id;
  const token = session?.access_token;
  const revision = JSON.stringify(budgets);
  const key = `${owner}:${month}:${revision}`;
  const [loaded, setLoaded] = useState<{ key: string; limits: Record<string, number> } | null>(null);
  useEffect(() => {
    if (localMode || !owner || !token || !picketApi) return;
    let active = true;
    void picketApi.getPlanning(token, month).then(planning => {
      if (active) setLoaded({ key, limits: Object.fromEntries(planning.periods.map(period => [period.budgetId, period.limit])) });
    }).catch(() => { /* Missing period data suppresses budget warnings, not other reminders. */ });
    return () => { active = false; };
  }, [localMode, owner, token, month, key, budgets]);
  return useMemo(() => localMode
    ? { periodsReady: !guest.loading, periodLimits: Object.fromEntries(budgets.map(budget => [budget.id, guest.data.planningPeriods[`${month}:${budget.id}`] ?? budget.defaultLimit])) }
    : { periodsReady: loaded?.key === key, periodLimits: loaded?.key === key ? loaded.limits : {} }, [localMode, guest.loading, guest.data.planningPeriods, budgets, month, loaded, key]);
}
