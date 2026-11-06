import type {
  Category,
  CreateCategoryRequest,
  CreateRefundRequest,
  CreateTransactionRequest,
  CreateTransferRequest,
  SetTransactionSplitsRequest,
  Transaction,
  TransactionSplit,
  UpdateCategoryRequest,
  UpdateTransactionRequest,
} from "@picket/domain";
import * as Crypto from "expo-crypto";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { picketApi } from "@/core/api/client";
import { apiErrorMessage, reportApiError } from "@/core/api/api-error-message";
import { ApiError } from "@picket/api-client";
import { OfflineQueuedError } from "@/core/sync/offline-queued-error";
import { enqueueMutation, listPendingMutations } from "@/core/sync/mutation-queue";
import { createOptimisticTransaction, restorePendingTransactions } from "@/core/sync/mutation-dependencies";
import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import { makeIdempotencyKey } from "@/core/sync/idempotency";
import { loadAllTransactions } from "@/core/sync/load-all-transactions";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";
import { useCachedState } from "@/core/sync/use-cached-state";
import { persistOptimisticCollection } from "@/core/sync/durable-optimistic";
import { useGuestFinance } from "@/core/local/guest-finance-context";

interface TransactionsContextValue {
  categories: Category[];
  transactions: Transaction[];
  error: string | null;
  loading: boolean;
  refresh(options?: { throwOnError?: boolean }): Promise<void>;
  createCategory(request: CreateCategoryRequest): Promise<Category>;
  updateCategory(id: string, request: UpdateCategoryRequest): Promise<Category>;
  archiveCategory(id: string, expectedVersion: number): Promise<void>;
  create(request: CreateTransactionRequest, guestReceiptId?: string): Promise<Transaction>;
  createTransfer(request: CreateTransferRequest): Promise<Transaction>;
  createRefund(id: string, request: CreateRefundRequest): Promise<Transaction>;
  update(id: string, request: UpdateTransactionRequest): Promise<Transaction>;
  archive(id: string, expectedVersion: number): Promise<void>;
  getSplits(id: string): Promise<TransactionSplit[]>;
  setSplits(
    id: string,
    request: SetTransactionSplitsRequest,
  ): Promise<TransactionSplit[]>;
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export function TransactionsProvider({ children }: PropsWithChildren) {
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const { profile } = useProfile();
  const enabled = session !== null && profile?.onboardingCompleted === true;
  const [categories, setCategories] = useCachedState<Category[]>(session?.user.id ?? null, "categories", []);
  const [transactions, setTransactions] = useCachedState<Transaction[]>(session?.user.id ?? null, "transactions", []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(session !== null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void Promise.all([
      readOfflineCache<Transaction[]>(session.user.id, "transactions"),
      listPendingMutations(session.user.id),
    ]).then(([cached, pending]) => {
      if (active) setTransactions(restorePendingTransactions(cached?.value ?? [], pending));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session, setTransactions]);

  const refresh = useCallback(async (options?: { throwOnError?: boolean }) => {
    if (!enabled || !session || !picketApi) { if (options?.throwOnError) throw new Error("Restore reload unavailable"); return; }
    const api = picketApi;
    setLoading(true);
    setError(null);
    try {
      const [categoryResult, transactionResult] = await Promise.all([
        picketApi.listCategories(session.access_token),
        loadAllTransactions<Transaction>(async (options) => (await api.listTransactions(session.access_token, options)).transactions),
      ]);
      setCategories(categoryResult.categories);
      setTransactions(transactionResult);
    } catch (error) {
      reportApiError("transactions.refresh", error);
      setError(apiErrorMessage(error, "Không tải được danh mục và giao dịch."));
      if (options?.throwOnError) throw error;
    } finally {
      setLoading(false);
    }
  }, [enabled, session, setCategories, setTransactions]);

  useEffect(() => {
    if (!enabled || !session || !picketApi) return;
    const api = picketApi;
    let active = true;
    void Promise.all([
      picketApi.listCategories(session.access_token),
      loadAllTransactions<Transaction>(async (options) => (await api.listTransactions(session.access_token, options)).transactions),
    ])
      .then(([categoryResult, transactionResult]) => {
        if (!active) return;
        setCategories(categoryResult.categories);
        setTransactions(transactionResult);
        setError(null);
      })
      .catch((error) => {
        if (active) {
          reportApiError("transactions.load", error);
          setError(apiErrorMessage(error, "Không tải được danh mục và giao dịch."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, session, setCategories, setTransactions]);

  const value = useMemo<TransactionsContextValue>(
    () => ({
      categories: localMode ? guest.data.categories : categories,
      transactions: localMode ? guest.data.transactions : transactions,
      error,
      loading: localMode ? guest.loading : loading,
      refresh: localMode ? async () => undefined : refresh,
      async createCategory(request) {
        if (localMode) {
          const now = new Date().toISOString();
          const category: Category = { id: Crypto.randomUUID(), name: request.name, kind: request.kind, color: request.color ?? null, icon: request.icon ?? null, custom: true, version: 1, createdAt: now, updatedAt: now, deletedAt: null };
          await guest.commit({ type: "category.upsert", value: category });
          return category;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        const idempotencyKey = makeIdempotencyKey(session.user.id);
        try {
          const result = await picketApi.createCategory(session.access_token, request, idempotencyKey);
          setCategories((current) => [...current, result.category]);
          return result.category;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({ userId: session.user.id, kind: "category.create", entityKey: null, payload: { request }, idempotencyKey });
          throw new OfflineQueuedError("category.create");
        }
      },
      async updateCategory(id, request) {
        if (localMode) {
          const existing = guest.data.categories.find((item) => item.id === id);
          if (!existing || existing.version !== request.expectedVersion) throw new Error("Danh mục đã thay đổi.");
          const { expectedVersion: _expectedVersion, ...patch } = request;
          const category = { ...existing, ...patch, version: existing.version + 1, updatedAt: new Date().toISOString() };
          await guest.commit({ type: "category.upsert", value: category });
          return category;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        try {
          const result = await picketApi.updateCategory(session.access_token, id, request);
          setCategories((current) => current.map((item) => item.id === result.category.id ? result.category : item));
          return result.category;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({ userId: session.user.id, kind: "category.update", entityKey: `category:${id}`, payload: { id, request }, idempotencyKey: null });
          setCategories((current) => current.map((item) => item.id === id ? { ...item, ...request } : item));
          throw new OfflineQueuedError("category.update");
        }
      },
      async archiveCategory(id, expectedVersion) {
        if (localMode) {
          const existing = guest.data.categories.find((item) => item.id === id);
          if (!existing || existing.version !== expectedVersion) throw new Error("Danh mục đã thay đổi.");
          await guest.commit({ type: "category.archive", id });
          return;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        try {
          await picketApi.archiveCategory(session.access_token, id, expectedVersion);
          setCategories((current) => current.filter((item) => item.id !== id));
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({ userId: session.user.id, kind: "category.archive", entityKey: `category:${id}`, payload: { id, expectedVersion }, idempotencyKey: null });
          setCategories((current) => current.filter((item) => item.id !== id));
          throw new OfflineQueuedError("category.archive");
        }
      },
      async create(request, guestReceiptId) {
        if (localMode) {
          if (!guestReceiptId && !guest.data.accounts.some((item) => item.id === request.accountId)) throw new Error("Hãy tạo ví trước khi ghi giao dịch.");
          const now = new Date().toISOString();
          const transaction: Transaction = { id: guestReceiptId ?? Crypto.randomUUID(), title: request.title, amount: request.amount, kind: request.kind, accountId: request.accountId, destinationAccountId: null, categoryId: request.categoryId ?? null, occurredAt: request.occurredAt, note: request.note ?? "", refundOfTransactionId: null, version: 1, createdAt: now, updatedAt: now, deletedAt: null };
          let accepted = transaction;
          await guest.commit(current => {
            if (guestReceiptId) accepted = current.transactions.find(item => item.id === guestReceiptId) ?? transaction;
            return { type: guestReceiptId ? "transaction.createOnce" : "transaction.upsert", value: transaction };
          });
          return accepted;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        const idempotencyKey = makeIdempotencyKey(session.user.id);
        try {
          const result = await picketApi.createTransaction(
            session.access_token,
            request,
            idempotencyKey,
          );
          setTransactions((current) => [
            result.transaction,
            ...current.filter((item) => item.id !== result.transaction.id),
          ]);
          return result.transaction;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          const clientEntityId = Crypto.randomUUID();
          const transaction = createOptimisticTransaction(
            request,
            clientEntityId,
            new Date().toISOString(),
          );
          await enqueueMutation({
            userId: session.user.id,
            kind: "transaction.create",
            entityKey: `transaction:${clientEntityId}`,
            payload: { request, clientEntityId },
            idempotencyKey,
          });
          await persistOptimisticCollection({
            current: transactions,
            optimistic: transaction,
            persist: (items) => writeOfflineCache(session.user.id, "transactions", items),
            publish: setTransactions,
          });
          return transaction;
        }
      },
      async createTransfer(request) {
        if (localMode) {
          if (request.sourceAccountId === request.destinationAccountId) throw new Error("Chọn hai ví khác nhau.");
          const now = new Date().toISOString();
          const transaction: Transaction = { id: Crypto.randomUUID(), title: request.title, amount: request.amount, kind: "transfer", accountId: request.sourceAccountId, destinationAccountId: request.destinationAccountId, categoryId: null, occurredAt: request.occurredAt, note: request.note ?? "", refundOfTransactionId: null, version: 1, createdAt: now, updatedAt: now, deletedAt: null };
          await guest.commit({ type: "transaction.upsert", value: transaction });
          return transaction;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        const idempotencyKey = makeIdempotencyKey(session.user.id);
        try {
          const result = await picketApi.createTransfer(
            session.access_token,
            request,
            idempotencyKey,
          );
          setTransactions((current) => [result.transaction, ...current]);
          return result.transaction;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({
            userId: session.user.id,
            kind: "transaction.transfer",
            entityKey: null,
            payload: { request },
            idempotencyKey,
          });
          throw new OfflineQueuedError("transaction.transfer");
        }
      },
      async createRefund(id, request) {
        if (localMode) {
          const original = guest.data.transactions.find((item) => item.id === id);
          if (!original || original.kind !== "expense") throw new Error("Không tìm thấy giao dịch chi cần hoàn tiền.");
          const refunded = guest.data.transactions.filter((item) => item.refundOfTransactionId === id).reduce((sum, item) => sum + item.amount, 0);
          if (request.amount <= 0 || refunded + request.amount > original.amount) throw new Error("Số tiền hoàn vượt khoản chi.");
          const now = new Date().toISOString();
          const transaction: Transaction = { id: Crypto.randomUUID(), title: `Hoàn tiền: ${original.title}`, amount: request.amount, kind: "refund", accountId: original.accountId, destinationAccountId: null, categoryId: original.categoryId, occurredAt: request.occurredAt, note: "", refundOfTransactionId: id, version: 1, createdAt: now, updatedAt: now, deletedAt: null };
          await guest.commit({ type: "transaction.upsert", value: transaction });
          return transaction;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        const idempotencyKey = makeIdempotencyKey(session.user.id);
        try {
          const result = await picketApi.createRefund(
            session.access_token,
            id,
            request,
            idempotencyKey,
          );
          setTransactions((current) => [result.transaction, ...current]);
          return result.transaction;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({
            userId: session.user.id,
            kind: "transaction.refund",
            entityKey: null,
            payload: { id, request },
            idempotencyKey,
          });
          throw new OfflineQueuedError("transaction.refund");
        }
      },
      async update(id, request) {
        if (localMode) {
          const existing = guest.data.transactions.find((item) => item.id === id);
          if (!existing || existing.version !== request.expectedVersion) throw new Error("Giao dịch đã thay đổi.");
          const { expectedVersion: _expectedVersion, ...patch } = request;
          const transaction = { ...existing, ...patch, version: existing.version + 1, updatedAt: new Date().toISOString() };
          await guest.commit({ type: "transaction.upsert", value: transaction });
          return transaction;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        try {
          const result = await picketApi.updateTransaction(session.access_token, id, request);
          setTransactions((current) => current.map((item) => item.id === result.transaction.id ? result.transaction : item));
          return result.transaction;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({ userId: session.user.id, kind: "transaction.update", entityKey: `transaction:${id}`, payload: { id, request }, idempotencyKey: null });
          setTransactions((current) => current.map((item) => item.id === id ? { ...item, ...request } : item));
          throw new OfflineQueuedError("transaction.update");
        }
      },
      async archive(id, expectedVersion) {
        if (localMode) {
          const existing = guest.data.transactions.find((item) => item.id === id);
          if (!existing || existing.version !== expectedVersion) throw new Error("Giao dịch đã thay đổi.");
          await guest.commit({ type: "transaction.archive", id });
          return;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        try {
          await picketApi.archiveTransaction(session.access_token, id, expectedVersion);
          setTransactions((current) => current.filter((item) => item.id !== id));
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({ userId: session.user.id, kind: "transaction.archive", entityKey: `transaction:${id}`, payload: { id, expectedVersion }, idempotencyKey: null });
          setTransactions((current) => current.filter((item) => item.id !== id));
          throw new OfflineQueuedError("transaction.archive");
        }
      },
      async getSplits(id) {
        if (localMode) return guest.data.splits[id] ?? [];
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        const result = await picketApi.listTransactionSplits(
          session.access_token,
          id,
        );
        return result.splits;
      },
      async setSplits(id, request) {
        if (localMode) {
          const original = guest.data.transactions.find((item) => item.id === id);
          if (!original || original.version !== request.expectedVersion) throw new Error("Giao dịch đã thay đổi.");
          if (request.splits.reduce((sum, item) => sum + item.amount, 0) !== original.amount) throw new Error("Tổng phân bổ phải bằng giá trị giao dịch.");
          const now = new Date().toISOString();
          const splits: TransactionSplit[] = request.splits.map((item) => ({ id: Crypto.randomUUID(), transactionId: id, categoryId: item.categoryId, amount: item.amount, version: 1, createdAt: now, updatedAt: now, deletedAt: null }));
          await guest.commit({ type: "split.replace", transactionId: id, values: splits });
          return splits;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        try {
          const result = await picketApi.setTransactionSplits(session.access_token, id, request);
          setTransactions((current) => current.map((item) => item.id === result.transaction.id ? result.transaction : item));
          return result.splits;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({ userId: session.user.id, kind: "transaction.splits", entityKey: `transaction:${id}`, payload: { id, request }, idempotencyKey: null });
          throw new OfflineQueuedError("transaction.splits");
        }
      },
    }),
    [categories, error, guest, loading, localMode, refresh, session, transactions, setCategories, setTransactions],
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions(): TransactionsContextValue {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error("useTransactions must be used inside TransactionsProvider.");
  }
  return context;
}
