import type {
  CreateAccountRequest,
  FinancialAccount,
  UpdateAccountRequest,
} from "@picket/domain";
import { ApiError } from "@picket/api-client";
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
import { OfflineQueuedError } from "@/core/sync/offline-queued-error";
import { enqueueMutation } from "@/core/sync/mutation-queue";
import { makeIdempotencyKey } from "@/core/sync/idempotency";
import { useAuth } from "@/features/auth/auth-context";

interface AccountsContextValue {
  accounts: FinancialAccount[];
  error: string | null;
  loading: boolean;
  refresh(): Promise<void>;
  create(request: CreateAccountRequest): Promise<FinancialAccount>;
  update(
    accountId: string,
    request: UpdateAccountRequest,
  ): Promise<FinancialAccount>;
  archive(accountId: string, expectedVersion: number): Promise<FinancialAccount>;
}

const AccountsContext = createContext<AccountsContextValue | null>(null);

export function AccountsProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(session !== null);

  const refresh = useCallback(async () => {
    if (!session || !picketApi) return;
    setLoading(true);
    setError(null);
    try {
      const result = await picketApi.listAccounts(session.access_token);
      setAccounts(result.accounts);
    } catch (error) {
      reportApiError("accounts.refresh", error);
      setError(apiErrorMessage(error, "Không tải được danh sách tài khoản."));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session || !picketApi) return;
    let active = true;
    void picketApi
      .listAccounts(session.access_token)
      .then((result) => {
        if (active) {
          setAccounts(result.accounts);
          setError(null);
        }
      })
      .catch((error) => {
        if (active) {
          reportApiError("accounts.load", error);
          setError(apiErrorMessage(error, "Không tải được danh sách tài khoản."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo<AccountsContextValue>(
    () => ({
      accounts,
      error,
      loading,
      refresh,
      async create(request) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
        const idempotencyKey = makeIdempotencyKey(session.user.id);
        try {
          const result = await picketApi.createAccount(session.access_token, request, idempotencyKey);
          setAccounts((current) => [...current, result.account]);
          return result.account;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({ userId: session.user.id, kind: "account.create", entityKey: null, payload: { request }, idempotencyKey });
          throw new OfflineQueuedError("account.create");
        }
      },
      async update(accountId, request) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
        try {
          const result = await picketApi.updateAccount(session.access_token, accountId, request);
          setAccounts((current) => current.map((account) => account.id === accountId ? result.account : account));
          return result.account;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({
            userId: session.user.id,
            kind: "account.update",
            entityKey: `account:${accountId}`,
            payload: { id: accountId, request },
            idempotencyKey: null,
          });
          setAccounts((current) => current.map((account) => account.id === accountId ? { ...account, ...request } : account));
          throw new OfflineQueuedError("account.update");
        }
      },
      async archive(accountId, expectedVersion) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
        try {
          const result = await picketApi.archiveAccount(session.access_token, accountId, expectedVersion);
          setAccounts((current) => current.filter((account) => account.id !== accountId));
          return result.account;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          await enqueueMutation({
            userId: session.user.id,
            kind: "account.archive",
            entityKey: `account:${accountId}`,
            payload: { id: accountId, expectedVersion },
            idempotencyKey: null,
          });
          setAccounts((current) => current.filter((account) => account.id !== accountId));
          throw new OfflineQueuedError("account.archive");
        }
      },
    }),
    [accounts, error, loading, refresh, session],
  );

  return (
    <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
  );
}

export function useAccounts(): AccountsContextValue {
  const context = useContext(AccountsContext);
  if (!context) throw new Error("useAccounts must be used inside AccountsProvider.");
  return context;
}
