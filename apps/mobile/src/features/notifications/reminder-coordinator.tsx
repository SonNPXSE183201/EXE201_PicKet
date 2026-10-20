import { useEffect, useMemo, useState } from "react";

import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";
import { useBills } from "@/features/bills/bills-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { onCloudKeepsakesChanged } from "@/features/keepsakes/cloud-keepsakes";
import { listKeepsakes, onKeepsakesChanged, type Keepsake } from "@/features/keepsakes/keepsake-store";
import { cancelUserReminders, collectReminders, scheduleUserReminders } from "@/features/notifications/reminders";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { useTransactionHistory } from "@/features/transactions/use-transaction-history";
import { useSpendingSplits } from "@/features/transactions/use-spending-splits";
import { useReminderPeriods } from "./use-reminder-periods";

export function ReminderCoordinator() {
  const { session } = useAuth();
  const { bills } = useBills();
  const { budgets } = useBudgets();
  const { subscriptions } = useSubscriptions();
  const { transactions: history, loading: historyLoading, error: historyError, refresh: refreshHistory } = useTransactionHistory();
  const month = new Date().toISOString().slice(0, 7);
  const { splits, loading: splitLoading, error: splitError } = useSpendingSplits(history, month);
  const { periodLimits, periodsReady } = useReminderPeriods(budgets, month);
  const [keepsakes, setKeepsakes] = useState<Keepsake[]>([]);
  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;
    let active = true;
    const reload = () => {
      void Promise.all([
        listKeepsakes(userId),
        picketApi?.listKeepsakes(session.access_token).then((result) => result.keepsakes).catch(() => []) ?? Promise.resolve([]),
      ]).then(([local, remote]) => {
        if (!active) return;
        const cloud: Keepsake[] = remote.map((item) => ({
          id: item.id, userId, title: item.title, amount: item.amount,
          date: item.purchasedAt, note: item.note, category: item.category,
          warrantyUntil: item.warrantyUntil, returnUntil: item.returnUntil,
          photoUri: null,
        }));
        const remoteIds = new Set(cloud.map((item) => item.id));
        setKeepsakes([...cloud, ...local.filter((item) => !remoteIds.has(item.id))]);
      }).catch(() => undefined);
    };
    reload();
    const unsubscribe = onKeepsakesChanged((owner) => { if (owner === userId) reload(); });
    const unsubscribeCloud = onCloudKeepsakesChanged((owner) => { if (owner === userId) reload(); });
    return () => { active = false; unsubscribe(); unsubscribeCloud(); };
  }, [session]);
  const userId = session?.user.id;
  useEffect(() => () => { if (userId) void cancelUserReminders(userId, true).catch(() => undefined); }, [userId]);
  useEffect(() => { if (session) void refreshHistory().catch(() => undefined); }, [session, bills, budgets, subscriptions, keepsakes, refreshHistory]);
  const items = useMemo(() => collectReminders({ bills, budgets: historyLoading || historyError || splitLoading || splitError || !periodsReady ? [] : budgets, subscriptions, transactions: history, keepsakes, periodLimits, splits }), [bills, budgets, subscriptions, history, historyLoading, historyError, splitLoading, splitError, periodsReady, keepsakes, periodLimits, splits]);
  useEffect(() => {
    let active = true;
    if (session) void scheduleUserReminders(session.user.id, items, () => active).catch(() => undefined);
    return () => { active = false; };
  }, [session, items]);
  return null;
}
