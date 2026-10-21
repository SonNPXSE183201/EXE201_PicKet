export function parseEditedConflictPayload(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Conflict payload must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message.includes("JSON object")) throw error;
    throw new Error("Conflict payload must be a JSON object.");
  }
}

const mergeKeys = ["title", "amount", "accountId", "categoryId", "occurredAt", "note"] as const;
export type TransactionMergeKey = typeof mergeKeys[number];
export type TransactionMergeChoice = Partial<Record<TransactionMergeKey, "local" | "server">>;
type MergeServer = { id: string; version: number; deletedAt: string | null } & Partial<Record<TransactionMergeKey, unknown>>;

export function transactionMergeFields(payload: Record<string, unknown>, server: MergeServer) {
  if (payload.id !== server.id) throw new Error("Mismatched conflict entity.");
  if (server.deletedAt) throw new Error("Transaction is archived.");
  if (!Number.isSafeInteger(server.version) || server.version < 1) throw new Error("Invalid server version.");
  const request = payload.request;
  if (!request || typeof request !== "object" || Array.isArray(request)) throw new Error("Unsupported conflict request.");
  const local = request as Record<string, unknown>;
  if (Object.keys(local).some(key => key !== "expectedVersion" && !mergeKeys.some(allowed => allowed === key))) {
    throw new Error("Unsupported conflict field.");
  }
  return mergeKeys.filter(key => Object.hasOwn(local, key)).map(key => ({ key, local: local[key], server: server[key] }));
}

export function buildTransactionMerge(payload: Record<string, unknown>, server: MergeServer, choices: TransactionMergeChoice) {
  const fields = transactionMergeFields(payload, server);
  const request: Record<string, unknown> = { expectedVersion: server.version };
  for (const field of fields) {
    if (choices[field.key] !== "local" && choices[field.key] !== "server") throw new Error("Each field needs an explicit choice.");
    if (choices[field.key] !== "local") continue;
    const value = field.local;
    if (field.key === "amount" && (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)) throw new Error("Invalid merge amount.");
    if (field.key === "categoryId" ? value !== null && (typeof value !== "string" || !value)
      : field.key !== "amount" && typeof value !== "string") throw new Error(`Invalid merge ${field.key}.`);
    if (field.key === "title" && !(value as string).trim()) throw new Error("Invalid merge title.");
    if (field.key === "occurredAt" && !Number.isFinite(Date.parse(value as string))) throw new Error("Invalid merge occurredAt.");
    request[field.key] = value;
  }
  if (Object.keys(request).length === 1) throw new Error("No local changes selected; keep server instead.");
  return { id: server.id, request };
}
