export const mutationQueueSchema = `
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
    `;
