import { MAX_MONEY, type CreateTransactionRequest } from "@picket/domain";

export function parseReceiptRequest(value: unknown): CreateTransactionRequest {
  const request = value as CreateTransactionRequest;
  if (!request || Array.isArray(request) || typeof request.title !== "string" || !request.title.trim()
    || !Number.isSafeInteger(request.amount) || request.amount <= 0 || request.amount > MAX_MONEY
    || !["expense", "income"].includes(request.kind) || typeof request.accountId !== "string" || !request.accountId
    || !(request.categoryId === undefined || request.categoryId === null || typeof request.categoryId === "string")
    || typeof request.occurredAt !== "string" || !Number.isFinite(Date.parse(request.occurredAt))
    || !(request.note === undefined || typeof request.note === "string")) throw new Error("Invalid receipt request");
  return { title: request.title, amount: request.amount, kind: request.kind, accountId: request.accountId,
    categoryId: request.categoryId ?? null, occurredAt: request.occurredAt, note: request.note ?? "" };
}

/** Persist the first complete payload before network side effects. Never replay
 * a modified form under the same transaction idempotency key after restart. */
export function createReceiptRequestJournal(io: {
  read(owner: string, id: string): Promise<unknown>;
  saveFirst(owner: string, id: string, request: CreateTransactionRequest): Promise<void>;
}) {
  const pending = new Map<string, Promise<CreateTransactionRequest>>();
  return { pin(owner: string, id: string, candidate: CreateTransactionRequest) {
    const key = JSON.stringify([owner,id]);
    const operation = (pending.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
      if (!owner || !id) throw new Error("Invalid receipt request identity");
      const stored = await io.read(owner,id);
      if (stored !== null) return parseReceiptRequest(stored);
      await io.saveFirst(owner,id,parseReceiptRequest(candidate));
      const accepted = await io.read(owner,id);
      if (accepted === null) throw new Error("Receipt request was not persisted");
      return parseReceiptRequest(accepted);
    });
    pending.set(key,operation);
    void operation.finally(() => { if (pending.get(key) === operation) pending.delete(key); }).catch(() => undefined);
    return operation;
  } };
}
