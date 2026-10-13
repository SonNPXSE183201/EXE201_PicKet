import type { Budget, CreateBudgetRequest, UpdateBudgetRequest } from "@picket/domain";
import { ApiError } from "@picket/api-client";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { picketApi } from "@/core/api/client";
import { apiErrorMessage, reportApiError } from "@/core/api/api-error-message";
import { OfflineQueuedError } from "@/core/sync/offline-queued-error";
import { enqueueMutation } from "@/core/sync/mutation-queue";
import { makeIdempotencyKey } from "@/core/sync/idempotency";
import { useAuth } from "@/features/auth/auth-context";

type Value = { budgets: Budget[]; loading: boolean; error: string | null; refresh(): Promise<void>; create(request: CreateBudgetRequest): Promise<Budget>; update(id: string, request: UpdateBudgetRequest): Promise<Budget>; archive(id: string, expectedVersion: number): Promise<void> };
const BudgetContext = createContext<Value | null>(null);

export function BudgetsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth(); const [budgets, setBudgets] = useState<Budget[]>([]); const [loading, setLoading] = useState(session !== null); const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => { if (!session || !picketApi) return; setLoading(true); setError(null); try { setBudgets((await picketApi.listBudgets(session.access_token)).budgets); } catch (error) { reportApiError("budgets.refresh", error); setError(apiErrorMessage(error, "Không tải được ngân sách.")); } finally { setLoading(false); } }, [session]);
  useEffect(() => {
    if (!session || !picketApi) return;
    let active = true;
    void picketApi.listBudgets(session.access_token)
      .then((result) => { if (active) { setBudgets(result.budgets); setError(null); } })
      .catch((error) => { if (active) { reportApiError("budgets.load", error); setError(apiErrorMessage(error, "Không tải được ngân sách.")); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session]);
  const value = useMemo<Value>(() => ({ budgets, loading, error, refresh,
    async create(request) { if (!session || !picketApi) throw new Error("Dart API is unavailable."); const idempotencyKey = makeIdempotencyKey(session.user.id); try { const result = await picketApi.createBudget(session.access_token, request, idempotencyKey); setBudgets((current) => [...current, result.budget]); return result.budget; } catch (error) { if (!(error instanceof ApiError) || error.status !== 0) throw error; await enqueueMutation({ userId: session.user.id, kind: "budget.create", entityKey: null, payload: { request }, idempotencyKey }); throw new OfflineQueuedError("budget.create"); } },
    async update(id, request) { if (!session || !picketApi) throw new Error("Dart API is unavailable."); try { const result = await picketApi.updateBudget(session.access_token, id, request); setBudgets((current) => current.map((item) => item.id === id ? result.budget : item)); return result.budget; } catch (error) { if (!(error instanceof ApiError) || error.status !== 0) throw error; await enqueueMutation({ userId: session.user.id, kind: "budget.update", entityKey: `budget:${id}`, payload: { id, request }, idempotencyKey: null }); setBudgets((current) => current.map((item) => item.id === id ? { ...item, ...request } : item)); throw new OfflineQueuedError("budget.update"); } },
    async archive(id, expectedVersion) { if (!session || !picketApi) throw new Error("Dart API is unavailable."); try { await picketApi.archiveBudget(session.access_token, id, expectedVersion); setBudgets((current) => current.filter((item) => item.id !== id)); } catch (error) { if (!(error instanceof ApiError) || error.status !== 0) throw error; await enqueueMutation({ userId: session.user.id, kind: "budget.archive", entityKey: `budget:${id}`, payload: { id, expectedVersion }, idempotencyKey: null }); setBudgets((current) => current.filter((item) => item.id !== id)); throw new OfflineQueuedError("budget.archive"); } },
  }), [budgets, error, loading, refresh, session]);
  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}
export function useBudgets() { const value = useContext(BudgetContext); if (!value) throw new Error("useBudgets must be used inside BudgetsProvider."); return value; }
