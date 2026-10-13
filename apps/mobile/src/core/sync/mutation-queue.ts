import * as SQLite from "expo-sqlite";

export type MutationKind =
  | "account.create"
  | "account.update"
  | "account.archive"
  | "budget.create"
  | "budget.update"
  | "budget.archive"
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
  if (mutation.entityKey && !mutation.kind.endsWith(".archive")) {
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM pending_mutations WHERE user_id = ? AND entity_key = ? AND kind = ? ORDER BY created_at LIMIT 1",
      mutation.userId,
      mutation.entityKey,
      mutation.kind,
    );
    if (existing) {
      await db.runAsync(
        "UPDATE pending_mutations SET payload = ?, idempotency_key = ?, attempts = 0 WHERE id = ?",
        JSON.stringify(mutation.payload),
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
    JSON.stringify(mutation.payload),
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
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    idempotencyKey: row.idempotency_key,
    entityKey: row.entity_key,
    attempts: row.attempts,
    createdAt: row.created_at,
  }));
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
      JSON.stringify(mutation.payload),
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
  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    idempotencyKey: row.idempotency_key,
    entityKey: row.entity_key,
    attempts: row.attempts,
    createdAt: row.created_at,
    reason: row.reason,
    failedAt: row.failed_at,
  }));
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
