import * as SQLite from "expo-sqlite";
import { decryptLocalPayload, encryptLocalPayload } from "@/core/sync/offline-cache";

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

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
const queueListeners = new Set<() => void>();

function notifyQueueChanged() {
  for (const listener of queueListeners) listener();
}

export function subscribeToMutationQueue(listener: () => void) {
  queueListeners.add(listener);
  return () => queueListeners.delete(listener);
}

async function database() {
  databasePromise ??= SQLite.openDatabaseAsync("picket-sync.db").then(async (db) => {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS pending_mutations (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        idempotency_key TEXT,
        user_id TEXT,
        entity_key TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS pending_mutations_created_idx
        ON pending_mutations(created_at, id);
      CREATE TABLE IF NOT EXISTS mutation_conflicts (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        idempotency_key TEXT,
        entity_key TEXT,
        attempts INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        reason TEXT NOT NULL,
        failed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mutation_entity_mappings (
        user_id TEXT NOT NULL,
        client_entity_id TEXT NOT NULL,
        server_entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (user_id, client_entity_id)
      );
    `);
    const columns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(pending_mutations)",
    );
    if (!columns.some((column) => column.name === "user_id")) {
      await db.execAsync("ALTER TABLE pending_mutations ADD COLUMN user_id TEXT");
    }
    if (!columns.some((column) => column.name === "entity_key")) {
      await db.execAsync("ALTER TABLE pending_mutations ADD COLUMN entity_key TEXT");
    }
    // Legacy rows cannot be safely attributed after another account signs in.
    await db.runAsync(
      "DELETE FROM pending_mutations WHERE user_id IS NULL OR user_id = ''",
    );
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS pending_mutations_owner_idx
        ON pending_mutations(user_id, created_at, id);
      CREATE INDEX IF NOT EXISTS pending_mutations_entity_idx
        ON pending_mutations(user_id, entity_key);
      CREATE INDEX IF NOT EXISTS mutation_conflicts_owner_idx
        ON mutation_conflicts(user_id, failed_at, id);
    `);
    return db;
  });
  return databasePromise;
}

function newId() {
  return `mutation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueueMutation(input: Omit<PendingMutation, "id" | "attempts" | "createdAt">) {
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
        "UPDATE pending_mutations SET payload = ?, idempotency_key = ?, attempts = 0 WHERE id = ?",
        await encryptLocalPayload(replacement, mutation.userId),
        mutation.idempotencyKey,
        existing.id,
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

export async function listPendingMutations(userId: string): Promise<PendingMutation[]> {
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

export async function removeMutation(id: string) {
  const db = await database();
  await db.runAsync("DELETE FROM pending_mutations WHERE id = ?", id);
  notifyQueueChanged();
}

export async function markMutationRetry(id: string) {
  const db = await database();
  await db.runAsync("UPDATE pending_mutations SET attempts = attempts + 1 WHERE id = ?", id);
  notifyQueueChanged();
}

export async function moveMutationToConflict(
  mutation: PendingMutation,
  reason: string,
) {
  const db = await database();
  const failedAt = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
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
    await db.runAsync("DELETE FROM pending_mutations WHERE id = ?", mutation.id);
  });
  notifyQueueChanged();
}

export async function listMutationConflicts(
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

export async function removeMutationConflict(id: string, userId: string) {
  const db = await database();
  await db.runAsync(
    "DELETE FROM mutation_conflicts WHERE id = ? AND user_id = ?",
    id,
    userId,
  );
  notifyQueueChanged();
}

export async function retryMutationConflict(
  conflict: MutationConflict,
  payload: Record<string, unknown>,
) {
  const db = await database();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
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
    await db.runAsync(
      "DELETE FROM mutation_conflicts WHERE id = ? AND user_id = ?",
      conflict.id,
      conflict.userId,
    );
  });
  notifyQueueChanged();
}

export async function pendingMutationCount(userId: string) {
  const db = await database();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM pending_mutations WHERE user_id = ?", userId);
  return row?.count ?? 0;
}

export async function mutationConflictCount(userId: string) {
  const db = await database();
  const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM mutation_conflicts WHERE user_id = ?", userId);
  return row?.count ?? 0;
}

export async function listMutationEntityMappings(userId: string) {
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

export async function saveMutationEntityMapping(
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
