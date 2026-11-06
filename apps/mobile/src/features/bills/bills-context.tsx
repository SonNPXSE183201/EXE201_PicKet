import { ApiError } from "@picket/api-client";
import type { Bill, CreateBillRequest, UpdateBillRequest } from "@picket/domain";
import * as Crypto from "expo-crypto";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { apiErrorMessage, reportApiError } from "@/core/api/api-error-message";
import { picketApi } from "@/core/api/client";
import { makeIdempotencyKey } from "@/core/sync/idempotency";
import { OfflineQueuedError } from "@/core/sync/offline-queued-error";
import { enqueueMutation } from "@/core/sync/mutation-queue";
import { useAuth } from "@/features/auth/auth-context";
import { useCachedState } from "@/core/sync/use-cached-state";
import { useGuestFinance } from "@/core/local/guest-finance-context";

type BillsValue = {
  bills: Bill[];
  loading: boolean;
  error: string | null;
  refresh(options?: { throwOnError?: boolean }): Promise<void>;
  create(request: CreateBillRequest): Promise<Bill>;
  update(id: string, request: UpdateBillRequest): Promise<Bill>;
  archive(id: string, expectedVersion: number): Promise<void>;
};

const BillsContext = createContext<BillsValue | null>(null);

export function BillsProvider({ children }: PropsWithChildren) {
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const [bills, setBills] = useCachedState<Bill[]>(session?.user.id ?? null, "bills", []);
  const [loading, setLoading] = useState(session !== null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { throwOnError?: boolean }) => {
    if (!session || !picketApi) { if (options?.throwOnError) throw new Error("Restore reload unavailable"); return; }
    setLoading(true); setError(null);
    try { setBills((await picketApi.listBills(session.access_token)).bills); }
    catch (caught) { reportApiError("bills.refresh", caught); setError(apiErrorMessage(caught, "Không tải được hóa đơn."));  if (options?.throwOnError) throw caught; } finally { setLoading(false); }
  }, [session, setBills]);

  useEffect(() => {
    if (!session || !picketApi) return;
    let active = true;
    void picketApi.listBills(session.access_token)
      .then((result) => { if (active) { setBills(result.bills); setError(null); } })
      .catch((caught) => { if (active) { reportApiError("bills.load", caught); setError(apiErrorMessage(caught, "Không tải được hóa đơn.")); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session, setBills]);

  const value = useMemo<BillsValue>(() => ({ bills: localMode ? guest.data.bills : bills, loading: localMode ? guest.loading : loading, error: localMode ? guest.error : error, refresh: localMode ? async () => undefined : refresh,
    async create(request) {
      if (localMode) { const now = new Date().toISOString(); const bill: Bill = { id: Crypto.randomUUID(), title: request.title, amount: request.amount, dueAt: request.dueAt, status: "pending", paidTransactionId: null, version: 1, createdAt: now, updatedAt: now, deletedAt: null }; await guest.commit({ type: "bill.upsert", value: bill }); return bill; }
      if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
      const idempotencyKey = makeIdempotencyKey(session.user.id);
      try { const result = await picketApi.createBill(session.access_token, request, idempotencyKey); setBills((current) => [...current, result.bill].sort((a, b) => a.dueAt.localeCompare(b.dueAt))); return result.bill; }
      catch (caught) { if (!(caught instanceof ApiError) || caught.status !== 0) throw caught; await enqueueMutation({ userId: session.user.id, kind: "bill.create", entityKey: null, payload: { request }, idempotencyKey }); throw new OfflineQueuedError("bill.create"); }
    },
    async update(id, request) {
      if (localMode) { const existing = guest.data.bills.find((item) => item.id === id); if (!existing || existing.version !== request.expectedVersion) throw new Error("Hóa đơn đã thay đổi."); const { expectedVersion: _expectedVersion, ...patch } = request; const bill = { ...existing, ...patch, version: existing.version + 1, updatedAt: new Date().toISOString() }; await guest.commit({ type: "bill.upsert", value: bill }); return bill; }
      if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
      try { const result = await picketApi.updateBill(session.access_token, id, request); setBills((current) => current.map((item) => item.id === id ? result.bill : item)); return result.bill; }
      catch (caught) { if (!(caught instanceof ApiError) || caught.status !== 0) throw caught; await enqueueMutation({ userId: session.user.id, kind: "bill.update", entityKey: `bill:${id}`, payload: { id, request }, idempotencyKey: null }); setBills((current) => current.map((item) => item.id === id ? { ...item, ...request } : item)); throw new OfflineQueuedError("bill.update"); }
    },
    async archive(id, expectedVersion) {
      if (localMode) { const existing = guest.data.bills.find((item) => item.id === id); if (!existing || existing.version !== expectedVersion) throw new Error("Hóa đơn đã thay đổi."); await guest.commit({ type: "bill.archive", id }); return; }
      if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
      try { await picketApi.archiveBill(session.access_token, id, expectedVersion); setBills((current) => current.filter((item) => item.id !== id)); }
      catch (caught) { if (!(caught instanceof ApiError) || caught.status !== 0) throw caught; await enqueueMutation({ userId: session.user.id, kind: "bill.archive", entityKey: `bill:${id}`, payload: { id, expectedVersion }, idempotencyKey: null }); setBills((current) => current.filter((item) => item.id !== id)); throw new OfflineQueuedError("bill.archive"); }
    },
  }), [bills, error, guest, loading, localMode, refresh, session, setBills]);

  return <BillsContext.Provider value={value}>{children}</BillsContext.Provider>;
}

export function useBills() {
  const value = useContext(BillsContext);
  if (!value) throw new Error("useBills must be used inside BillsProvider.");
  return value;
}
