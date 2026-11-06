import type { Budget, CreateBudgetRequest, UpdateBudgetRequest } from "@picket/domain";
import * as Crypto from "expo-crypto";
import { ApiError } from "@picket/api-client";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { picketApi } from "@/core/api/client";
import { apiErrorMessage, reportApiError } from "@/core/api/api-error-message";
import { OfflineQueuedError } from "@/core/sync/offline-queued-error";
import { enqueueMutation } from "@/core/sync/mutation-queue";
import { makeIdempotencyKey } from "@/core/sync/idempotency";
import { useAuth } from "@/features/auth/auth-context";
import { useCachedState } from "@/core/sync/use-cached-state";
import { useGuestFinance } from "@/core/local/guest-finance-context";

type Value = { budgets: Budget[]; loading: boolean; error: string | null; refresh(options?: { throwOnError?: boolean }): Promise<void>; create(request: CreateBudgetRequest): Promise<Budget>; update(id: string, request: UpdateBudgetRequest): Promise<Budget>; archive(id: string, expectedVersion: number): Promise<void> };
const BudgetContext = createContext<Value | null>(null);

export function BudgetsProvider({ children }: PropsWithChildren) {
  const { session, localMode } = useAuth(); const guest = useGuestFinance(); const [budgets, setBudgets] = useCachedState<Budget[]>(session?.user.id ?? null, "budgets", []); const [loading, setLoading] = useState(session !== null); const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async (options?: { throwOnError?: boolean }) => { if (!session || !picketApi) { if (options?.throwOnError) throw new Error("Restore reload unavailable"); return; } setLoading(true); setError(null); try { setBudgets((await picketApi.listBudgets(session.access_token)).budgets); } catch (error) { reportApiError("budgets.refresh", error); setError(apiErrorMessage(error, "Không tải được ngân sách."));  if (options?.throwOnError) throw error; } finally { setLoading(false); } }, [session, setBudgets]);
  useEffect(() => {
    if (!session || !picketApi) return;
    let active = true;
    void picketApi.listBudgets(session.access_token)
      .then((result) => { if (active) { setBudgets(result.budgets); setError(null); } })
      .catch((error) => { if (active) { reportApiError("budgets.load", error); setError(apiErrorMessage(error, "Không tải được ngân sách.")); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, setBudgets]);
  const value = useMemo<Value>(() => ({ budgets: localMode ? guest.data.budgets : budgets, loading: localMode ? guest.loading : loading, error, refresh: localMode ? async () => undefined : refresh,
    async create(request) { if (localMode) { const now = new Date().toISOString(); const budget: Budget = { id: Crypto.randomUUID(), categoryId: request.categoryId, name: request.name, defaultLimit: request.defaultLimit, alertPercent: request.alertPercent, active: true, version: 1, createdAt: now, updatedAt: now, deletedAt: null }; await guest.commit({ type: "budget.upsert", value: budget }); return budget; } if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại."); const idempotencyKey = makeIdempotencyKey(session.user.id); try { const result = await picketApi.createBudget(session.access_token, request, idempotencyKey); setBudgets((current) => [...current, result.budget]); return result.budget; } catch (error) { if (!(error instanceof ApiError) || error.status !== 0) throw error; await enqueueMutation({ userId: session.user.id, kind: "budget.create", entityKey: null, payload: { request }, idempotencyKey }); throw new OfflineQueuedError("budget.create"); } },
    async update(id, request) { if (localMode) { const existing = guest.data.budgets.find((item) => item.id === id); if (!existing || existing.version !== request.expectedVersion) throw new Error("Ngân sách đã thay đổi."); const { expectedVersion: _expectedVersion, ...patch } = request; const budget = { ...existing, ...patch, version: existing.version + 1, updatedAt: new Date().toISOString() }; await guest.commit({ type: "budget.upsert", value: budget }); return budget; } if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại."); try { const result = await picketApi.updateBudget(session.access_token, id, request); setBudgets((current) => current.map((item) => item.id === id ? result.budget : item)); return result.budget; } catch (error) { if (!(error instanceof ApiError) || error.status !== 0) throw error; await enqueueMutation({ userId: session.user.id, kind: "budget.update", entityKey: `budget:${id}`, payload: { id, request }, idempotencyKey: null }); setBudgets((current) => current.map((item) => item.id === id ? { ...item, ...request } : item)); throw new OfflineQueuedError("budget.update"); } },
    async archive(id, expectedVersion) { if (localMode) { const existing = guest.data.budgets.find((item) => item.id === id); if (!existing || existing.version !== expectedVersion) throw new Error("Ngân sách đã thay đổi."); await guest.commit({ type: "budget.archive", id }); return; } if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại."); try { await picketApi.archiveBudget(session.access_token, id, expectedVersion); setBudgets((current) => current.filter((item) => item.id !== id)); } catch (error) { if (!(error instanceof ApiError) || error.status !== 0) throw error; await enqueueMutation({ userId: session.user.id, kind: "budget.archive", entityKey: `budget:${id}`, payload: { id, expectedVersion }, idempotencyKey: null }); setBudgets((current) => current.filter((item) => item.id !== id)); throw new OfflineQueuedError("budget.archive"); } },
  }), [budgets, error, guest, loading, localMode, refresh, session, setBudgets]);
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}
export function useBudgets() { const value = useContext(BudgetContext); if (!value) throw new Error("useBudgets must be used inside BudgetsProvider."); return value; }
