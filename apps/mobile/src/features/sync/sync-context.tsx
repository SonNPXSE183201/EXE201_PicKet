import { AppState } from "react-native";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { picketApi } from "@/core/api/client";
import {
  subscribeToFinanceChanges,
  type FinanceRealtimeConnection,
} from "@/core/sync/finance-realtime";
import { createQueueWakeup, shouldRefreshFromRealtime } from "@/core/sync/finance-realtime-policy";
import { refreshFinanceSlices } from "@/core/sync/refresh-finance-slices";
import { flushPendingMutations } from "@/core/sync/mutation-executor";
import { mutationConflictCount, pendingMutationCount, subscribeToMutationQueue } from "@/core/sync/mutation-queue";
import { useAccounts } from "@/features/accounts/accounts-context";
import { useAuth } from "@/features/auth/auth-context";
import { useBudgets } from "@/features/budgets/budgets-context";
import { useBills } from "@/features/bills/bills-context";
import { useProfile } from "@/features/profile/profile-context";
import { useSubscriptions } from "@/features/subscriptions/subscriptions-context";
import { useTransactions } from "@/features/transactions/transactions-context";

type SyncValue = { pendingCount: number; conflictCount: number; syncing: boolean; realtimeConnection: FinanceRealtimeConnection; lastSyncedAt: number | null; refreshRemote(): Promise<void>; flush(): Promise<void> };
const SyncContext = createContext<SyncValue | null>(null);

export function SyncProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const { refresh: refreshProfile } = useProfile();
  const { refresh: refreshAccounts } = useAccounts();
  const { refresh: refreshTransactions } = useTransactions();
  const { refresh: refreshBudgets } = useBudgets();
  const { refresh: refreshBills } = useBills();
  const { refresh: refreshSubscriptions } = useSubscriptions();
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [realtimeConnection, setRealtimeConnection] = useState<FinanceRealtimeConnection>("disconnected");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const syncingRef = useRef(false);
  const pendingCountRef = useRef(0);
  const refreshingRemoteRef = useRef(false);
  const refreshRemote = useCallback(async (tables?: readonly string[]) => {
    if (!session || !picketApi || refreshingRemoteRef.current) return;
    refreshingRemoteRef.current = true;
    try {
      // Until optimistic overlays are merged with remote snapshots, refreshing
      // over unsent edits would silently replace the user's local changes.
      if (await pendingMutationCount(session.user.id) > 0) return;
      await refreshFinanceSlices({
        profile: refreshProfile,
        accounts: refreshAccounts,
        transactions: refreshTransactions,
        budgets: refreshBudgets,
        bills: refreshBills,
        subscriptions: refreshSubscriptions,
      }, tables);
    } finally {
      refreshingRemoteRef.current = false;
    }
  }, [refreshAccounts, refreshBills, refreshBudgets, refreshProfile, refreshSubscriptions, refreshTransactions, session]);
  const flush = useCallback(async () => {
    if (!session || !picketApi || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await flushPendingMutations(picketApi, session.access_token, session.user.id);
      if (result.completed > 0 || result.conflicts > 0) {
        setLastSyncedAt(Date.now());
        await refreshRemote();
      }
    } finally {
      const [pending, conflicts] = await Promise.all([
        pendingMutationCount(session.user.id),
        mutationConflictCount(session.user.id),
      ]);
      setPendingCount(pending);
      setConflictCount(conflicts);
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshRemote, session]);
  useEffect(() => {
    pendingCountRef.current = pendingCount;
  }, [pendingCount]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    const queueWake = createQueueWakeup(() => { void flush().catch(() => undefined); });
    void Promise.all([
      pendingMutationCount(session.user.id),
      mutationConflictCount(session.user.id),
    ]).then(([pending, conflicts]) => {
      setPendingCount(pending);
      setConflictCount(conflicts);
    });
    const unsubscribe = subscribeToMutationQueue(() => {
      const notifiedDuringFlush = syncingRef.current;
      void pendingMutationCount(session.user.id).then((pending) => {
        if (!active) return;
        setPendingCount(pending);
        queueWake.request(pending, notifiedDuringFlush || syncingRef.current);
      }).catch(() => undefined);
      void mutationConflictCount(session.user.id).then((count) => { if (active) setConflictCount(count); }).catch(() => undefined);
    });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void flush().catch(() => undefined);
        void refreshRemote().catch(() => undefined);
      }
    });
    const unsubscribeRealtime = subscribeToFinanceChanges({
      userId: session.user.id,
      onChange(tables) {
        if (shouldRefreshFromRealtime({
          pendingCount: pendingCountRef.current,
          syncing: syncingRef.current,
        })) {
          void refreshRemote(tables);
        }
      },
      onConnectionChange(connection) {
        if (!active) return;
        setRealtimeConnection(connection);
        if (connection === "connected") queueWake.request(pendingCountRef.current, syncingRef.current);
      },
    });
    const initialTimer = setTimeout(() => {
      void flush();
      void refreshRemote();
    }, 0);
    const remotePoll = setInterval(() => {
      void flush().catch(() => undefined);
      void refreshRemote();
    }, 30_000);
    return () => { active = false; queueWake.dispose(); clearTimeout(initialTimer); clearInterval(remotePoll); subscription.remove(); unsubscribeRealtime(); unsubscribe(); };
  }, [session, flush, refreshRemote]);
  const value = useMemo(() => ({ pendingCount, conflictCount, syncing, realtimeConnection, lastSyncedAt, refreshRemote, flush }), [pendingCount, conflictCount, syncing, realtimeConnection, lastSyncedAt, refreshRemote, flush]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
export function useSync() { const value = useContext(SyncContext); if (!value) throw new Error("useSync must be used inside SyncProvider."); return value; }
