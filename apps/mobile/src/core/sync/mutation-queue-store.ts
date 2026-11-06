export type MutationKind =
  | "account.create"
  | "account.update"
  | "account.archive"
  | "budget.create"
  | "budget.update"
  | "budget.archive"
  | "bill.create"
  | "bill.update"
  | "bill.archive"
  | "subscription.create"
  | "subscription.update"
  | "subscription.archive"
  | "category.create"
  | "category.update"
  | "category.archive"
  | "transaction.create"
  | "transaction.transfer"
  | "transaction.refund"
  | "transaction.update"
  | "transaction.archive"
  | "transaction.splits";

export interface PendingMutation {
  id: string;
  userId: string;
  kind: MutationKind;
  payload: Record<string, unknown>;
  idempotencyKey: string | null;
  entityKey: string | null;
  attempts: number;
  createdAt: string;
}

export interface MutationConflict extends PendingMutation {
  reason: string;
  failedAt: string;
}

type Bind = string | number | null;
export type QueueConnection = {
 runAsync(sql:string,...params:Bind[]):Promise<unknown>;
 getFirstAsync<T>(sql:string,...params:Bind[]):Promise<T|null>;
 getAllAsync<T>(sql:string,...params:Bind[]):Promise<T[]>;
};
export type QueueDatabase = QueueConnection & {withExclusiveTransactionAsync(operation:(tx:QueueConnection)=>Promise<void>):Promise<void>};
type Source = {
 database():Promise<QueueDatabase>;
 encrypt(value:unknown,owner:string):Promise<string>;
 decrypt<T>(payload:string,owner:string):Promise<T>;
 newId():string; notify():void;
 access<T>(owner:string,operation:()=>Promise<T>):Promise<T>;
};
export function createMutationQueueStore(source:Source){
 const {database,encrypt:encryptLocalPayload,decrypt:decryptLocalPayload,newId,notify:notifyQueueChanged}=source;
async function enqueueMutation(input: Omit<PendingMutation, "id" | "attempts" | "createdAt">) {
  const mutation: PendingMutation = {
    ...input,
    id: newId(),
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  const db = await database();
  const encodedPayload = await encryptLocalPayload(mutation.payload, mutation.userId);
  if (mutation.entityKey && !mutation.kind.endsWith(".archive")) {
    const existing = await db.getFirstAsync<{ id: string; payload: string }>(
      "SELECT id, payload FROM pending_mutations WHERE user_id = ? AND entity_key = ? AND kind = ? ORDER BY created_at LIMIT 1",
      mutation.userId,
      mutation.entityKey,
      mutation.kind,
    );
    if (existing) {
      let replacement = mutation.payload;
      if (mutation.kind.endsWith(".update")) {
        const prior = await decryptLocalPayload<Record<string, unknown>>(existing.payload, mutation.userId);
        const firstRequest = prior.request as Record<string, unknown> | undefined;
        const latestRequest = mutation.payload.request as Record<string, unknown> | undefined;
        if (firstRequest && latestRequest) {
          replacement = {
            ...mutation.payload,
            request: { ...firstRequest, ...latestRequest, expectedVersion: firstRequest.expectedVersion },
          };
        }
      }
      await db.runAsync(
        "UPDATE pending_mutations SET payload = ?, idempotency_key = ?, attempts = 0 WHERE id = ? AND user_id = ?",
        await encryptLocalPayload(replacement, mutation.userId),
        mutation.idempotencyKey,
        existing.id,
        mutation.userId,
      );
      notifyQueueChanged();
      return { ...mutation, id: existing.id };
    }
  }
  if (mutation.entityKey && mutation.kind.endsWith(".archive")) {
    await db.runAsync(
      "DELETE FROM pending_mutations WHERE user_id = ? AND entity_key = ?",
      mutation.userId,
      mutation.entityKey,
    );
  }
  await db.runAsync(
    "INSERT INTO pending_mutations (id, user_id, kind, payload, idempotency_key, entity_key, attempts, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    mutation.id,
    mutation.userId,
    mutation.kind,
    encodedPayload,
    mutation.idempotencyKey,
    mutation.entityKey,
    mutation.attempts,
    mutation.createdAt,
  );
  notifyQueueChanged();
  return mutation;
}

async function listPendingMutations(userId: string): Promise<PendingMutation[]> {
  const db = await database();
  const rows = await db.getAllAsync<{
    id: string;
    user_id: string;
    kind: MutationKind;
    payload: string;
    idempotency_key: string | null;
    entity_key: string | null;
    attempts: number;
    created_at: string;
  }>("SELECT id, user_id, kind, payload, idempotency_key, entity_key, attempts, created_at FROM pending_mutations WHERE user_id = ? ORDER BY created_at ASC, id ASC", userId);
  return Promise.all(rows.map(async (row) => {
    const payload = await decryptLocalPayload<Record<string, unknown>>(row.payload, row.user_id);
    if (!row.payload.startsWith("enc-v1:")) {
      await db.runAsync("UPDATE pending_mutations SET payload = ? WHERE id = ? AND user_id = ? AND payload = ?", await encryptLocalPayload(payload, row.user_id), row.id, row.user_id, row.payload);
    }
    return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    payload,
    idempotencyKey: row.idempotency_key,
    entityKey: row.entity_key,
    attempts: row.attempts,
    createdAt: row.created_at,
  }; }));
}

async function removeMutation(id: string, userId: string) {
  const db = await database();
  await db.runAsync("DELETE FROM pending_mutations WHERE id = ? AND user_id = ?", id, userId);
  notifyQueueChanged();
}

async function markMutationRetry(id: string, userId: string) {
  const db = await database();
  await db.runAsync("UPDATE pending_mutations SET attempts = attempts + 1 WHERE id = ? AND user_id = ?", id, userId);
  notifyQueueChanged();
}

async function moveMutationToConflict(
  mutation: PendingMutation,
  reason: string,
) {
  const db = await database();
  const failedAt = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const pending = await tx.getFirstAsync<{user_id:string}>("SELECT user_id FROM pending_mutations WHERE id = ?", mutation.id);
    const existing = await tx.getFirstAsync<{user_id:string}>("SELECT user_id FROM mutation_conflicts WHERE id = ?", mutation.id);
    if (pending?.user_id !== mutation.userId || (existing && existing.user_id !== mutation.userId)) throw Error("Queued mutation owner changed or row is missing");
    await tx.runAsync(
      `INSERT OR REPLACE INTO mutation_conflicts
       (id, user_id, kind, payload, idempotency_key, entity_key, attempts,
        created_at, reason, failed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      mutation.id,
      mutation.userId,
      mutation.kind,
      await encryptLocalPayload(mutation.payload, mutation.userId),
      mutation.idempotencyKey,
      mutation.entityKey,
      mutation.attempts + 1,
      mutation.createdAt,
      reason,
      failedAt,
    );
    await tx.runAsync("DELETE FROM pending_mutations WHERE id = ? AND user_id = ?", mutation.id, mutation.userId);
  });
  notifyQueueChanged();
}

async function listMutationConflicts(
  userId: string,
): Promise<MutationConflict[]> {
  const db = await database();
  const rows = await db.getAllAsync<{
    id: string; user_id: string; kind: MutationKind; payload: string;
    idempotency_key: string | null; entity_key: string | null;
    attempts: number; created_at: string; reason: string; failed_at: string;
  }>(
    `SELECT id, user_id, kind, payload, idempotency_key, entity_key, attempts,
            created_at, reason, failed_at
       FROM mutation_conflicts WHERE user_id = ? ORDER BY failed_at DESC`,
    userId,
  );
  return Promise.all(rows.map(async (row) => {
    const payload = await decryptLocalPayload<Record<string, unknown>>(row.payload, row.user_id);
    if (!row.payload.startsWith("enc-v1:")) {
      await db.runAsync("UPDATE mutation_conflicts SET payload = ? WHERE id = ? AND user_id = ? AND payload = ?", await encryptLocalPayload(payload, row.user_id), row.id, row.user_id, row.payload);
    }
    return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    payload,
    idempotencyKey: row.idempotency_key,
    entityKey: row.entity_key,
    attempts: row.attempts,
    createdAt: row.created_at,
    reason: row.reason,
    failedAt: row.failed_at,
  }; }));
}

async function removeMutationConflict(id: string, userId: string) {
  const db = await database();
  await db.runAsync(
    "DELETE FROM mutation_conflicts WHERE id = ? AND user_id = ?",
    id,
    userId,
  );
  notifyQueueChanged();
}

async function retryMutationConflict(
  conflict: MutationConflict,
  payload: Record<string, unknown>,
) {
  const db = await database();
  await db.withExclusiveTransactionAsync(async (tx) => {
    const current = await tx.getFirstAsync<{user_id:string}>("SELECT user_id FROM mutation_conflicts WHERE id = ?", conflict.id);
    const pending = await tx.getFirstAsync<{user_id:string}>("SELECT user_id FROM pending_mutations WHERE id = ?", conflict.id);
    if (current?.user_id !== conflict.userId || (pending && pending.user_id !== conflict.userId)) throw Error("Conflict owner changed or row is missing");
    await tx.runAsync(
      `INSERT OR REPLACE INTO pending_mutations
       (id, user_id, kind, payload, idempotency_key, entity_key, attempts,
        created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      conflict.id,
      conflict.userId,
      conflict.kind,
      await encryptLocalPayload(payload, conflict.userId),
      conflict.idempotencyKey,
      conflict.entityKey,
      conflict.createdAt,
    );
    await tx.runAsync(
      "DELETE FROM mutation_conflicts WHERE id = ? AND user_id = ?",
      conflict.id,
      conflict.userId,
    );
  });
  notifyQueueChanged();
}

async function pendingMutationCount(userId: string) {
  const db = await database();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM pending_mutations WHERE user_id = ?", userId);
  return row?.count ?? 0;
}

async function mutationConflictCount(userId: string) {
  const db = await database();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM mutation_conflicts WHERE user_id = ?", userId);
  return row?.count ?? 0;
}

async function listMutationEntityMappings(userId: string) {
  const db = await database();
  const rows = await db.getAllAsync<{
    client_entity_id: string;
    server_entity_id: string;
  }>(
    `SELECT client_entity_id, server_entity_id
       FROM mutation_entity_mappings WHERE user_id = ?`,
    userId,
  );
  return new Map(
    rows.map((row) => [row.client_entity_id, row.server_entity_id]),
  );
}

async function saveMutationEntityMapping(
  userId: string,
  clientEntityId: string,
  serverEntityId: string,
  entityType: string,
) {
  const db = await database();
  await db.runAsync(
    `INSERT OR REPLACE INTO mutation_entity_mappings
       (user_id, client_entity_id, server_entity_id, entity_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    userId,
    clientEntityId,
    serverEntityId,
    entityType,
    new Date().toISOString(),
  );
}

function owned<Args extends unknown[], Result>(operation:(...args:Args)=>Promise<Result>, ownerOf:(...args:Args)=>string){
 return (...args:Args)=>source.access(ownerOf(...args),()=>operation(...args));
}
return {
 enqueueMutation:owned(enqueueMutation,input=>input.userId),
 listPendingMutations:owned(listPendingMutations,owner=>owner),
 removeMutation:owned(removeMutation,(_id,owner)=>owner),
 markMutationRetry:owned(markMutationRetry,(_id,owner)=>owner),
 moveMutationToConflict:owned(moveMutationToConflict,mutation=>mutation.userId),
 listMutationConflicts:owned(listMutationConflicts,owner=>owner),
 removeMutationConflict:owned(removeMutationConflict,(_id,owner)=>owner),
 retryMutationConflict:owned(retryMutationConflict,conflict=>conflict.userId),
 pendingMutationCount:owned(pendingMutationCount,owner=>owner),
 mutationConflictCount:owned(mutationConflictCount,owner=>owner),
 listMutationEntityMappings:owned(listMutationEntityMappings,owner=>owner),
 saveMutationEntityMapping:owned(saveMutationEntityMapping,owner=>owner),
};
}

export async function eraseMutationQueueOwner(db:QueueDatabase,owner:string){
 await db.withExclusiveTransactionAsync(async tx=>{
  await tx.runAsync("DELETE FROM pending_mutations WHERE user_id = ?",owner);
  await tx.runAsync("DELETE FROM mutation_conflicts WHERE user_id = ?",owner);
  await tx.runAsync("DELETE FROM mutation_entity_mappings WHERE user_id = ?",owner);
 });
}
