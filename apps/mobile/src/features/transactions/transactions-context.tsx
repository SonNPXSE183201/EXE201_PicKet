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
import { enqueueMutation } from "@/core/sync/mutation-queue";
import { makeIdempotencyKey } from "@/core/sync/idempotency";
import { useAuth } from "@/features/auth/auth-context";
import { useProfile } from "@/features/profile/profile-context";

interface TransactionsContextValue {
  categories: Category[];
  transactions: Transaction[];
  error: string | null;
  loading: boolean;
  refresh(): Promise<void>;
  createCategory(request: CreateCategoryRequest): Promise<Category>;
  updateCategory(id: string, request: UpdateCategoryRequest): Promise<Category>;
  archiveCategory(id: string, expectedVersion: number): Promise<void>;
  create(request: CreateTransactionRequest): Promise<Transaction>;
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
  const { session } = useAuth();
  const { profile } = useProfile();
  const enabled = session !== null && profile?.onboardingCompleted === true;
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(session !== null);

  const refresh = useCallback(async () => {
    if (!enabled || !session || !picketApi) return;
    setLoading(true);
    setError(null);
    try {
      const [categoryResult, transactionResult] = await Promise.all([
        picketApi.listCategories(session.access_token),
        picketApi.listTransactions(session.access_token),
      ]);
      setCategories(categoryResult.categories);
      setTransactions(transactionResult.transactions);
    } catch (error) {
      reportApiError("transactions.refresh", error);
      setError(apiErrorMessage(error, "Không tải được danh mục và giao dịch."));
    } finally {
      setLoading(false);
    }
  }, [enabled, session]);

  useEffect(() => {
    if (!enabled || !session || !picketApi) return;
    let active = true;
    void Promise.all([
      picketApi.listCategories(session.access_token),
      picketApi.listTransactions(session.access_token),
    ])
      .then(([categoryResult, transactionResult]) => {
        if (!active) return;
        setCategories(categoryResult.categories);
        setTransactions(transactionResult.transactions);
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
  }, [enabled, session]);

  const value = useMemo<TransactionsContextValue>(
    () => ({
      categories,
      transactions,
      error,
      loading,
      refresh,
      async createCategory(request) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
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
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
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
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
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
      async create(request) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
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
          await enqueueMutation({
            userId: session.user.id,
            kind: "transaction.create",
            entityKey: null,
            payload: { request },
            idempotencyKey,
          });
          throw new OfflineQueuedError("transaction.create");
        }
      },
      async createTransfer(request) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
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
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
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
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
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
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
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
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
        const result = await picketApi.listTransactionSplits(
          session.access_token,
          id,
        );
        return result.splits;
      },
      async setSplits(id, request) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
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
    [categories, error, loading, refresh, session, transactions],
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
