import type {
  CreateAccountRequest,
  FinancialAccount,
  UpdateAccountRequest,
} from "@picket/domain";
import * as Crypto from "expo-crypto";
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
import { enqueueMutation, listPendingMutations } from "@/core/sync/mutation-queue";
import { makeIdempotencyKey } from "@/core/sync/idempotency";
import { useAuth } from "@/features/auth/auth-context";
import { useCachedState } from "@/core/sync/use-cached-state";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { createOptimisticAccount, restorePendingAccounts } from "@/core/sync/mutation-dependencies";
import { readOfflineCache } from "@/core/sync/offline-cache";

interface AccountsContextValue {
  accounts: FinancialAccount[];
  error: string | null;
  loading: boolean;
  refresh(options?: { throwOnError?: boolean }): Promise<void>;
  create(request: CreateAccountRequest): Promise<FinancialAccount>;
  update(
    accountId: string,
    request: UpdateAccountRequest,
  ): Promise<FinancialAccount>;
  archive(accountId: string, expectedVersion: number): Promise<FinancialAccount>;
}

const AccountsContext = createContext<AccountsContextValue | null>(null);

export function AccountsProvider({ children }: PropsWithChildren) {
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const [accounts, setAccounts] = useCachedState<FinancialAccount[]>(session?.user.id ?? null, "accounts", []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(session !== null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void Promise.all([
      readOfflineCache<FinancialAccount[]>(session.user.id, "accounts"),
      listPendingMutations(session.user.id),
    ]).then(([cached, pending]) => {
      if (active) setAccounts(restorePendingAccounts(cached?.value ?? [], pending));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session, setAccounts]);

  const refresh = useCallback(async (options?: { throwOnError?: boolean }) => {
    if (!session || !picketApi) { if (options?.throwOnError) throw new Error("Restore reload unavailable"); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await picketApi.listAccounts(session.access_token);
      setAccounts(result.accounts);
    } catch (error) {
      reportApiError("accounts.refresh", error);
      setError(apiErrorMessage(error, "Không tải được danh sách tài khoản."));
      if (options?.throwOnError) throw error;
    } finally {
      setLoading(false);
    }
  }, [session, setAccounts]);

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
  }, [session, setAccounts]);

  const value = useMemo<AccountsContextValue>(
    () => ({
      accounts: localMode ? guest.data.accounts : accounts,
      error,
      loading: localMode ? guest.loading : loading,
      refresh: localMode ? async () => undefined : refresh,
      async create(request) {
        if (localMode) {
          const now = new Date().toISOString();
          const account: FinancialAccount = { id: Crypto.randomUUID(), name: request.name, kind: request.kind, currencyCode: request.currencyCode, openingBalance: request.openingBalance, archived: false, version: 1, createdAt: now, updatedAt: now, deletedAt: null };
          await guest.commit({ type: "account.upsert", value: account });
          return account;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        const idempotencyKey = makeIdempotencyKey(session.user.id);
        try {
          const result = await picketApi.createAccount(session.access_token, request, idempotencyKey);
          setAccounts((current) => [...current, result.account]);
          return result.account;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 0) throw error;
          const clientEntityId = Crypto.randomUUID();
          const account = createOptimisticAccount(
            request,
            clientEntityId,
            new Date().toISOString(),
          );
          await enqueueMutation({ userId: session.user.id, kind: "account.create", entityKey: `account:${clientEntityId}`, payload: { request, clientEntityId }, idempotencyKey });
          setAccounts((current) => [...current, account]);
          return account;
        }
      },
      async update(accountId, request) {
        if (localMode) {
          const existing = guest.data.accounts.find((item) => item.id === accountId);
          if (!existing || existing.version !== request.expectedVersion) throw new Error("Tài khoản đã thay đổi. Hãy tải lại.");
          const { expectedVersion: _expectedVersion, ...patch } = request;
          const account = { ...existing, ...patch, version: existing.version + 1, updatedAt: new Date().toISOString() };
          await guest.commit({ type: "account.upsert", value: account });
          return account;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
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
        if (localMode) {
          const existing = guest.data.accounts.find((item) => item.id === accountId);
          if (!existing || existing.version !== expectedVersion) throw new Error("Tài khoản đã thay đổi. Hãy tải lại.");
          const account = { ...existing, archived: true, deletedAt: new Date().toISOString(), version: existing.version + 1 };
          await guest.commit({ type: "account.archive", id: accountId });
          return account;
        }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
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
    [accounts, error, guest, loading, localMode, refresh, session, setAccounts],
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
