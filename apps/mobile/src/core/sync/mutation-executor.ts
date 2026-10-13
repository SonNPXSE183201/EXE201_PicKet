import type { PicketApiClient } from "@picket/api-client";
import type { CreateAccountRequest, CreateBudgetRequest, CreateCategoryRequest, CreateRefundRequest, CreateTransactionRequest, CreateTransferRequest, SetTransactionSplitsRequest, UpdateAccountRequest, UpdateBudgetRequest, UpdateCategoryRequest, UpdateTransactionRequest } from "@picket/domain";
import { listPendingMutations, markMutationRetry, moveMutationToConflict, pendingMutationCount, removeMutation, type PendingMutation } from "@/core/sync/mutation-queue";
import { decideMutationFailure, mutationFailureReason } from "@/core/sync/mutation-policy";

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
  const pending = await listPendingMutations(userId);
  let completed = 0;
  let conflicts = 0;
  for (const mutation of pending) {
    try {
      await execute(client, accessToken, mutation);
      await removeMutation(mutation.id);
      completed += 1;
    } catch (error) {
      if (decideMutationFailure(error, mutation.attempts) === "conflict") {
        await moveMutationToConflict(mutation, mutationFailureReason(error));
        conflicts += 1;
        continue;
      }
      await markMutationRetry(mutation.id);
      break;
    }
  }
  return { completed, conflicts, remaining: await pendingMutationCount(userId) };
}
