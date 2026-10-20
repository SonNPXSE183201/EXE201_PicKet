import * as SQLite from "expo-sqlite";
import { decryptLocalPayload, encryptLocalPayload } from "@/core/sync/offline-cache";
import { createFallbackOutbox, type FallbackIntent } from "./fallback-outbox";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
function database() {
  databasePromise ??= SQLite.openDatabaseAsync("picket-capture.db").then(async db => {
    await db.execAsync(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS capture_ocr_intents (
        owner_id TEXT NOT NULL, capture_id TEXT NOT NULL, payload TEXT NOT NULL,
        PRIMARY KEY(owner_id, capture_id)
      )`);
    return db;
  });
  return databasePromise;
}

export async function readFallbackIntent(owner: string, captureId: string) {
  const row = await (await database()).getFirstAsync<{ payload: string }>(
    "SELECT payload FROM capture_ocr_intents WHERE owner_id=? AND capture_id=?", owner, captureId);
  if (!row) return null;
  if (!row.payload.startsWith("enc-v1:")) throw new Error("Invalid encrypted OCR intent");
  return decryptLocalPayload<FallbackIntent>(row.payload, `capture-ocr:${owner}:${captureId}`);
}

export const fallbackOutbox = createFallbackOutbox({
  read: readFallbackIntent,
  write: async intent => {
    const payload = await encryptLocalPayload(intent, `capture-ocr:${intent.owner}:${intent.captureId}`);
    await (await database()).runAsync(`INSERT INTO capture_ocr_intents(owner_id,capture_id,payload)
      VALUES(?,?,?) ON CONFLICT(owner_id,capture_id) DO UPDATE SET payload=excluded.payload`,
    intent.owner, intent.captureId, payload);
  },
});
