import type {
  CreateAccountRequest,
  CreateTransactionRequest,
  FinancialAccount,
  Transaction,
} from "@picket/domain";

import type { MutationKind, PendingMutation } from "./mutation-queue";

export function createOptimisticAccount(
  request: CreateAccountRequest,
  clientEntityId: string,
  createdAt: string,
): FinancialAccount {
  return {
    id: clientEntityId,
    name: request.name,
    kind: request.kind,
    currencyCode: request.currencyCode,
    openingBalance: request.openingBalance,
    archived: false,
    version: 1,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  };
}

export function createOptimisticTransaction(
  request: CreateTransactionRequest,
  clientEntityId: string,
  createdAt: string,
): Transaction {
  return {
    id: clientEntityId,
    title: request.title,
    amount: request.amount,
    kind: request.kind,
    accountId: request.accountId,
    destinationAccountId: null,
    categoryId: request.categoryId ?? null,
    occurredAt: request.occurredAt,
    note: request.note ?? "",
    refundOfTransactionId: null,
    version: 1,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  };
}

export function restorePendingTransactions(
  cached: Transaction[],
  pending: PendingMutation[],
) {
  const restored = pending.flatMap((mutation) => {
    if (mutation.kind !== "transaction.create") return [];
    const request = mutation.payload.request;
    const clientEntityId = mutation.payload.clientEntityId;
    if (!request || typeof request !== "object" || Array.isArray(request) || typeof clientEntityId !== "string") return [];
    return [createOptimisticTransaction(
      request as unknown as CreateTransactionRequest,
      clientEntityId,
      mutation.createdAt,
    )];
  });
  const restoredIds = new Set(restored.map((item) => item.id));
  return [...restored, ...cached.filter((item) => !restoredIds.has(item.id))];
}

export function restorePendingAccounts(
  cached: FinancialAccount[],
  pending: PendingMutation[],
) {
  const restored = pending.flatMap((mutation) => {
    if (mutation.kind !== "account.create") return [];
    const request = mutation.payload.request;
    const clientEntityId = mutation.payload.clientEntityId;
    if (!request || typeof request !== "object" || Array.isArray(request) || typeof clientEntityId !== "string") return [];
    return [createOptimisticAccount(
      request as unknown as CreateAccountRequest,
      clientEntityId,
      mutation.createdAt,
    )];
  });
  const restoredIds = new Set(restored.map((item) => item.id));
  return [...cached.filter((item) => !restoredIds.has(item.id)), ...restored];
}

export function resolveMutationDependencies(
  kind: MutationKind,
  payload: Record<string, unknown>,
  entityMappings: ReadonlyMap<string, string>,
): Record<string, unknown> {
  const resolved = structuredClone(payload);
  if (kind !== "transaction.create") return resolved;

  const request = resolved.request;
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    return resolved;
  }
  const accountId = (request as Record<string, unknown>).accountId;
  if (typeof accountId !== "string") return resolved;
  const serverId = entityMappings.get(accountId);
  if (serverId) (request as Record<string, unknown>).accountId = serverId;
  return resolved;
}
