import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from "react";

import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import { applyGuestMutation, emptyGuestFinance, guestOwnerId, type GuestFinance, type GuestMutation } from "@/core/local/guest-finance";
import { useAuth } from "@/features/auth/auth-context";

type GuestFinanceValue = { data: GuestFinance; loading: boolean; error: string | null; commit(mutation: GuestMutation | ((current: GuestFinance) => GuestMutation)): Promise<void>; replace(value: GuestFinance): Promise<void> };
const GuestFinanceContext = createContext<GuestFinanceValue | null>(null);

export function GuestFinanceProvider({ children }: PropsWithChildren) {
  const { localMode } = useAuth();
  const [data, setData] = useState<GuestFinance>(emptyGuestFinance);
  const [loading, setLoading] = useState(localMode);
  const [error, setError] = useState<string | null>(null);
  const current = useRef(data);
  const pending = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    if (!localMode) return;
    let active = true;
    void readOfflineCache<GuestFinance>(guestOwnerId, "guest-finance")
      .then((cached) => {
        if (!active) return;
        const restored = { ...emptyGuestFinance(), ...(cached?.value ?? {}) };
        current.current = restored;
        setData(restored);
      })
      .catch(() => { if (active) setError("Không đọc được dữ liệu trên thiết bị. Dữ liệu cũ chưa bị xóa hoặc ghi đè."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [localMode]);

  const commit = useCallback((mutation: GuestMutation | ((current: GuestFinance) => GuestMutation)) => {
    if (loading || error) return Promise.reject(new Error(error ?? "Dữ liệu trên thiết bị chưa tải xong."));
    const operation = pending.current.catch(() => undefined).then(async () => {
      const next = applyGuestMutation(current.current, typeof mutation === "function" ? mutation(current.current) : mutation);
      await writeOfflineCache(guestOwnerId, "guest-finance", next);
      current.current = next;
      setData(next);
    });
    pending.current = operation;
    return operation;
  }, [error, loading]);

  const replace = useCallback((value: GuestFinance) => {
    if (loading || error) return Promise.reject(new Error(error ?? "Dữ liệu trên thiết bị chưa tải xong."));
    const operation = pending.current.catch(() => undefined).then(async () => {
      await writeOfflineCache(guestOwnerId, "guest-finance", value);
      current.current = value;
      setData(value);
    });
    pending.current = operation;
    return operation;
  }, [error, loading]);

  return <GuestFinanceContext.Provider value={{ data, loading, error, commit, replace }}>{children}</GuestFinanceContext.Provider>;
}

export function useGuestFinance() {
  const context = useContext(GuestFinanceContext);
  if (!context) throw new Error("useGuestFinance must be used inside GuestFinanceProvider.");
  return context;
}
