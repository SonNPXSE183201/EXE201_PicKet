import * as SQLite from "expo-sqlite";
import { decryptLocalPayload, encryptLocalPayload } from "@/core/sync/offline-cache";
import { createFallbackOutbox, type FallbackIntent } from "./fallback-outbox";
import { capturePhotoLeases } from "./capture-photo-cleanup";

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

export async function fallbackImageReferences(owner: string): Promise<string[]> {
  const rows = await (await database()).getAllAsync<{ capture_id: string; payload: string }>(
    "SELECT capture_id,payload FROM capture_ocr_intents WHERE owner_id=?", owner);
  return Promise.all(rows.map(async row => {
    if (!row.payload.startsWith("enc-v1:")) throw new Error("Invalid encrypted OCR intent");
    const intent = await decryptLocalPayload<FallbackIntent>(row.payload, `capture-ocr:${owner}:${row.capture_id}`);
    if (intent.owner !== owner || intent.captureId !== row.capture_id || typeof intent.imageRef !== "string" || !intent.imageRef) {
      throw new Error("Invalid OCR image reference");
    }
    return intent.imageRef;
  }));
}

export const fallbackOutbox = createFallbackOutbox({
  read: readFallbackIntent,
  write: intent => capturePhotoLeases.use(intent.owner, async () => {
    const payload = await encryptLocalPayload(intent, `capture-ocr:${intent.owner}:${intent.captureId}`);
    await (await database()).runAsync(`INSERT INTO capture_ocr_intents(owner_id,capture_id,payload)
      VALUES(?,?,?) ON CONFLICT(owner_id,capture_id) DO UPDATE SET payload=excluded.payload`,
    intent.owner, intent.captureId, payload);
  }),
});
