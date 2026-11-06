import type { PicketApiClient } from "@picket/api-client";
import type { CreateAccountRequest, CreateBillRequest, CreateBudgetRequest, CreateCategoryRequest, CreateRefundRequest, CreateSubscriptionRequest, CreateTransactionRequest, CreateTransferRequest, SetTransactionSplitsRequest, UpdateAccountRequest, UpdateBillRequest, UpdateBudgetRequest, UpdateCategoryRequest, UpdateSubscriptionRequest, UpdateTransactionRequest } from "@picket/domain";
import { resolveMutationDependencies } from "@/core/sync/mutation-dependencies";
import { listMutationEntityMappings, listPendingMutations, markMutationRetry, moveMutationToConflict, pendingMutationCount, removeMutation, saveMutationEntityMapping, type PendingMutation } from "@/core/sync/mutation-queue";
import { decideMutationFailure, mutationFailureReason } from "@/core/sync/mutation-policy";
import { isOfflineCacheOwnerRetired } from "./offline-cache";

function text(value: unknown) { if (typeof value !== "string" || !value) throw new Error("Invalid queued payload."); return value; }
function number(value: unknown) { if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid queued payload."); return value; }

async function execute(client: PicketApiClient, token: string, mutation: PendingMutation) {
  const payload = mutation.payload;
  switch (mutation.kind) {
    case "account.create": return client.createAccount(token, payload.request as CreateAccountRequest, text(mutation.idempotencyKey));
    case "account.update": return client.updateAccount(token, text(payload.id), payload.request as UpdateAccountRequest);
    case "account.archive": return client.archiveAccount(token, text(payload.id), number(payload.expectedVersion));
    case "budget.create": return client.createBudget(token, payload.request as CreateBudgetRequest, text(mutation.idempotencyKey));
    case "budget.update": return client.updateBudget(token, text(payload.id), payload.request as UpdateBudgetRequest);
    case "budget.archive": return client.archiveBudget(token, text(payload.id), number(payload.expectedVersion));
    case "bill.create": return client.createBill(token, payload.request as CreateBillRequest, text(mutation.idempotencyKey));
    case "bill.update": return client.updateBill(token, text(payload.id), payload.request as UpdateBillRequest);
    case "bill.archive": return client.archiveBill(token, text(payload.id), number(payload.expectedVersion));
    case "subscription.create": return client.createSubscription(token, payload.request as CreateSubscriptionRequest, text(mutation.idempotencyKey));
    case "subscription.update": return client.updateSubscription(token, text(payload.id), payload.request as UpdateSubscriptionRequest);
    case "subscription.archive": return client.archiveSubscription(token, text(payload.id), number(payload.expectedVersion));
    case "category.create": return client.createCategory(token, payload.request as CreateCategoryRequest, text(mutation.idempotencyKey));
    case "category.update": return client.updateCategory(token, text(payload.id), payload.request as UpdateCategoryRequest);
    case "category.archive": return client.archiveCategory(token, text(payload.id), number(payload.expectedVersion));
    case "transaction.create": return client.createTransaction(token, payload.request as CreateTransactionRequest, text(mutation.idempotencyKey));
    case "transaction.transfer": return client.createTransfer(token, payload.request as CreateTransferRequest, text(mutation.idempotencyKey));
    case "transaction.refund": return client.createRefund(token, text(payload.id), payload.request as CreateRefundRequest, text(mutation.idempotencyKey));
    case "transaction.update": return client.updateTransaction(token, text(payload.id), payload.request as UpdateTransactionRequest);
    case "transaction.archive": return client.archiveTransaction(token, text(payload.id), number(payload.expectedVersion));
    case "transaction.splits": return client.setTransactionSplits(token, text(payload.id), payload.request as SetTransactionSplitsRequest);
    default: throw new Error("Unsupported queued mutation.");
  }
}

export async function flushPendingMutations(client: PicketApiClient, accessToken: string, userId: string) {
  if (await isOfflineCacheOwnerRetired(userId)) return {completed:0,conflicts:0,remaining:0};
  const pending = await listPendingMutations(userId);
  const entityMappings = await listMutationEntityMappings(userId);
  let completed = 0;
  let conflicts = 0;
  for (const mutation of pending) {
    if (await isOfflineCacheOwnerRetired(userId)) break;
    try {
      const resolved = {
        ...mutation,
        payload: resolveMutationDependencies(
          mutation.kind,
          mutation.payload,
          entityMappings,
        ),
      };
      const result = await execute(client, accessToken, resolved);
      const clientEntityId = mutation.payload.clientEntityId;
      const account = result && typeof result === "object"
        ? (result as { account?: { id?: unknown } }).account
        : undefined;
      if (
        mutation.kind === "account.create" &&
        typeof clientEntityId === "string" &&
        typeof account?.id === "string"
      ) {
        await saveMutationEntityMapping(
          userId,
          clientEntityId,
          account.id,
          "account",
        );
        entityMappings.set(clientEntityId, account.id);
      }
      await removeMutation(mutation.id, userId);
      completed += 1;
    } catch (error) {
      if (decideMutationFailure(error, mutation.attempts) === "conflict") {
        await moveMutationToConflict(mutation, mutationFailureReason(error));
        conflicts += 1;
        // Later mutations may reference this entity. Stop instead of turning
        // every dependent change into a second, misleading conflict.
        break;
      }
      await markMutationRetry(mutation.id, userId);
      break;
    }
  }
  return { completed, conflicts, remaining: await pendingMutationCount(userId) };
}
